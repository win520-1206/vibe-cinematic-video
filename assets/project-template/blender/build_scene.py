"""Optional Blender test: a shell opens at the shared event, exposing a core. Original geometry."""
import bpy,sys,json,math
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];job=json.loads(Path(args[0]).read_text(encoding='utf8'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
sc=bpy.context.scene;sc.render.engine=job['engine'];sc.render.resolution_x=job['width'];sc.render.resolution_y=job['height'];sc.render.resolution_percentage=100
from fractions import Fraction
rate=Fraction(str(job['fps']));sc.render.fps=math.ceil(float(rate));sc.render.fps_base=sc.render.fps/float(rate)
sc.frame_start=1;sc.frame_end=job['frames'];sc.render.image_settings.file_format='PNG';sc.render.image_settings.color_mode='RGBA';sc.render.film_transparent=job['transparent'];sc.render.filepath=job['pattern']
if hasattr(sc,'cycles'):sc.cycles.samples=16;sc.cycles.device='CPU'
def material(name,color,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=.3;return m
warm=material('Shell',(.55,.35,.1),.65);cool=material('Core',(.15,.42,.65),.3)
bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=.55);bpy.context.object.data.materials.append(cool)
for side in [-1,1]:
 bpy.ops.mesh.primitive_cube_add(size=1,location=(side*.7,0,0));obj=bpy.context.object;obj.scale=(.16,1,1);obj.data.materials.append(warm)
 event=job['eventFrame'];obj.keyframe_insert(data_path='location',frame=max(1,event));obj.location.x=side*1.8;obj.keyframe_insert(data_path='location',frame=min(job['frames'],event+max(1,round(job['fps']))))
 for fc in obj.animation_data.action.fcurves if hasattr(obj.animation_data.action,'fcurves') else []:
  for key in fc.keyframe_points:key.interpolation='LINEAR'
bpy.ops.object.camera_add(location=(4,-6,3));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();sc.camera=cam;cam.data.type='PERSP';cam.data.lens=45
for loc,energy,size in [((2,-4,5),900,5),((-3,-1,2),600,4)]:
 bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=energy;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(-light.location).to_track_quat('-Z','Y').to_euler()
sc.world.color=(.03,.03,.03)
bpy.ops.wm.save_as_mainfile(filepath=job['blendFile']);bpy.ops.render.render(animation=True)
