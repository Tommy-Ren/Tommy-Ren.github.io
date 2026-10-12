"""Run with Blender 5.1 --background --python scripts/build-avatar-eyes.py.

Preserves the original source. Input is the decoded website avatar created by
scripts/prepare-avatar-eyes.mjs --prepare-input. Eye calibration uses asset
coordinates, not camera coordinates. Exported eye pivots face glTF local +Z.
"""
import bpy, math, json, pathlib, numpy as np
from mathutils import Vector, Quaternion
from mathutils.bvhtree import BVHTree

ROOT = pathlib.Path(__file__).resolve().parents[1]
TOOLS = ROOT / '.preview/model-tools'
SOURCE = ROOT / 'artwork/avatar'
SOURCE.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(TOOLS / 'tommy-avatar-decoded.glb'))
head_body = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
head_body.name = 'Head_Surface'
bpy.context.view_layer.objects.active = head_body
head_body.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
original = head_body.data
positions = np.empty((len(original.vertices), 3), dtype=np.float32)
original.vertices.foreach_get('co', positions.reshape(-1))
indices = np.empty(len(original.loops), dtype=np.int32)
original.loops.foreach_get('vertex_index', indices)
indices = indices.reshape(-1, 3)
assert len(original.polygons) == len(indices), 'Input must be triangulated'
uv = np.empty((len(original.loops), 2), dtype=np.float32)
original.uv_layers.active.data.foreach_get('uv', uv.reshape(-1))
normals = np.empty((len(original.corner_normals), 3), dtype=np.float32)
original.corner_normals.foreach_get('vector', normals.reshape(-1))
triangles = positions[indices]
centroids = triangles.mean(axis=1)
face_normals = np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0])
face_normals /= np.maximum(np.linalg.norm(face_normals, axis=1, keepdims=True), 1e-12)

head = bpy.data.objects.new('Head', None)
bpy.context.collection.objects.link(head)
head.empty_display_type = 'PLAIN_AXES'
head.empty_display_size = .1
head_body.parent = head

sclera = bpy.data.materials.new('Eye_Sclera_Back')
sclera.use_nodes = True
principled = sclera.node_tree.nodes.get('Principled BSDF')
principled.inputs['Base Color'].default_value = (.40, .43, .48, 1)
principled.inputs['Roughness'].default_value = .5

def make_surface(name, face_mask, pivot, add_sphere=False, radius=0):
    face_ids = np.nonzero(face_mask)[0]
    face_vertices = indices[face_ids]
    vertex_ids, mapping = np.unique(face_vertices, return_inverse=True)
    points = positions[vertex_ids] - np.array(pivot)
    faces = mapping.reshape(-1, 3).tolist()
    point_list = points.tolist()
    patch_count = len(faces)
    # A closed white backing stays behind the authored visible eye surface.
    if add_sphere:
        segments, rings = 96, 48
        offset = len(point_list)
        patch_bvh = BVHTree.FromPolygons(point_list, faces, all_triangles=True)
        for j in range(rings + 1):
            theta = math.pi * j / rings
            for i in range(segments):
                phi = 2 * math.pi * i / segments
                direction = Vector((math.sin(theta) * math.cos(phi), math.sin(theta) * math.sin(phi), math.cos(theta)))
                shell_radius = radius
                if direction.y < -.25:
                    hit, _, _, distance = patch_bvh.ray_cast(Vector((0, 0, 0)), direction, .1)
                    if hit is not None: shell_radius = min(radius, distance - .0008)
                point_list.append(list(direction * shell_radius))
        for j in range(rings):
            for i in range(segments):
                a = offset + j * segments + i
                b = offset + j * segments + (i + 1) % segments
                c = offset + (j + 1) * segments + (i + 1) % segments
                d = offset + (j + 1) * segments + i
                if j != 0: faces.append([a, d, b])
                if j != rings - 1: faces.append([b, d, c])
    mesh = bpy.data.meshes.new(name + '_Mesh')
    mesh.from_pydata(point_list, [], faces)
    mesh.update()
    mesh.materials.append(original.materials[0])
    if add_sphere: mesh.materials.append(sclera)
    texcoords = mesh.uv_layers.new(name='UVMap')
    corner_uv = np.zeros((len(mesh.loops), 2), dtype=np.float32)
    corner_uv[:patch_count * 3] = uv.reshape(-1, 3, 2)[face_ids].reshape(-1, 2)
    texcoords.data.foreach_set('uv', corner_uv.reshape(-1))
    smooth = np.ones(len(mesh.polygons), dtype=bool)
    mesh.polygons.foreach_set('use_smooth', smooth)
    material_indices = np.zeros(len(mesh.polygons), dtype=np.int32)
    material_indices[patch_count:] = 1
    mesh.polygons.foreach_set('material_index', material_indices)
    custom = np.zeros((len(mesh.loops), 3), dtype=np.float32)
    custom[:patch_count * 3] = normals.reshape(-1, 3, 3)[face_ids].reshape(-1, 3)
    if add_sphere:
        added = np.array(point_list, dtype=np.float32)
        sphere_loop_vertices = np.empty(len(mesh.loops), dtype=np.int32)
        mesh.loops.foreach_get('vertex_index', sphere_loop_vertices)
        unit = added[sphere_loop_vertices[patch_count * 3:]]
        custom[patch_count * 3:] = unit / np.maximum(np.linalg.norm(unit, axis=1, keepdims=True), 1e-12)
    mesh.normals_split_custom_set(custom.tolist())
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = pivot
    obj.parent = head
    return obj, patch_count

calibration = [
    # Anatomical left is on the viewer's right.
    ('Eye_L', (.13373994, -.23162888, .40603462), .05911620),
    ('Eye_R', (-.13662139, -.22785200, .40642801), .06090591),
]
removed = np.zeros(len(indices), dtype=bool)
report = []
for name, center, radius in calibration:
    radial = centroids - np.array(center)
    distance = np.linalg.norm(radial, axis=1)
    alignment = np.sum(face_normals * radial, axis=1) / np.maximum(distance, 1e-12)
    # Segment the spherical eye surface, leaving the fixed eyelids/glasses.
    mask = ((np.abs(distance - radius) < .0085) & (alignment > .45)
            & (radial[:, 1] < -.018) & (np.abs(radial[:, 0]) < .074)
            & (radial[:, 2] > -.048) & (radial[:, 2] < .044))
    eye, count = make_surface(name, mask, center, True, radius - .001)
    eye['gaze_forward'] = '+Z in glTF; -Y in Blender'
    eye['gaze_yaw_limit_degrees'] = 12
    eye['gaze_pitch_limit_degrees'] = 6
    removed |= mask
    report.append({'name': name, 'center_blender': center, 'radius': radius, 'authored_eye_faces': count})
    assert count > 100, 'Eye selection unexpectedly empty'

replacement, kept = make_surface('Head_Surface_New', ~removed, (0, 0, 0))
# Keep the original imported object as a hidden backup in the editable source,
# but export only the new head and two eyes.
backup_collection = bpy.data.collections.new('Reference_Original_Web_Head')
bpy.context.scene.collection.children.link(backup_collection)
for collection in list(head_body.users_collection): collection.objects.unlink(head_body)
backup_collection.objects.link(head_body)
backup_collection.hide_viewport = True
backup_collection.hide_render = True
head_body.parent = None
head_body.name = 'Reference_Head_Before_Eyes'
replacement.name = 'Head_Surface'

# Separate non-exported target: eye constraints in Blender make the rig directly
# editable. Export uses the zero/rest rotation for the browser's gaze controller.
target = bpy.data.objects.new('Gaze_Target', None)
bpy.context.collection.objects.link(target)
target.empty_display_type = 'SPHERE'
target.empty_display_size = .03
target.location = (0, -4, .406)
target['how_to_use'] = 'Move this target with G to preview eye gaze. Eye angles are limited in the website.'
for name, _, _ in calibration:
    eye = bpy.data.objects[name]
    constraint = eye.constraints.new(type='DAMPED_TRACK')
    constraint.name = 'Look_at_Gaze_Target'
    constraint.target = target
    constraint.track_axis = 'TRACK_NEGATIVE_Y'
    constraint.influence = 0
    limit = eye.constraints.new(type='LIMIT_ROTATION')
    limit.name = 'Natural_Eye_Angles'
    limit.owner_space = 'LOCAL'
    limit.use_limit_x = True
    limit.min_x, limit.max_x = -math.radians(6), math.radians(6)
    limit.use_limit_y = True
    limit.min_y = limit.max_y = 0
    limit.use_limit_z = True
    limit.min_z, limit.max_z = -math.radians(12), math.radians(12)

bpy.context.scene.world = bpy.data.worlds.new('Avatar_World')
bpy.context.scene.world.color = (.08, .08, .08)
bpy.context.scene.frame_set(1)
for obj in bpy.context.scene.objects: obj.select_set(False)
for obj in [head, replacement, bpy.data.objects['Eye_L'], bpy.data.objects['Eye_R']]: obj.select_set(True)
bpy.context.view_layer.objects.active = replacement
raw = TOOLS / 'tommy-avatar-eye-rig-raw.glb'
bpy.ops.export_scene.gltf(filepath=str(raw), export_format='GLB', use_selection=True, export_animations=False, export_extras=True, export_yup=True, export_image_format='AUTO')

# Enable editable gaze AFTER exporting the neutral browser asset.
for name, _, _ in calibration:
    bpy.data.objects[name].constraints['Look_at_Gaze_Target'].influence = 1
for obj in bpy.context.scene.objects: obj.select_set(False)
target.select_set(True)
bpy.context.view_layer.objects.active = target
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.shading.type = 'MATERIAL'
            area.spaces.active.region_3d.view_distance = 1.7
            area.spaces.active.region_3d.view_location = Vector((0, 0, .49))
            area.spaces.active.region_3d.view_rotation = Quaternion((1, 0, 0), math.pi / 2)
            area.spaces.active.region_3d.view_perspective = 'ORTHO'
blend = SOURCE / 'tommy-avatar-eye-rig.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend), compress=True)
(TOOLS / 'eye-rig-build-report.json').write_text(json.dumps({'eyes': report, 'removed_faces': int(removed.sum()), 'kept_faces': kept, 'raw_glb': str(raw), 'blend': str(blend)}, indent=2))
print('EYE_RIG_RESULT ' + json.dumps(report))
