import type { PanoramaVideoConfig } from './tour-types';
type Vec = [number, number, number];
const rad = Math.PI / 180;
const sub = (a: Vec, b: Vec): Vec => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const scale = (a: Vec, n: number): Vec => [a[0]*n, a[1]*n, a[2]*n];
const dot = (a: Vec,b: Vec) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a: Vec,b: Vec): Vec => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

/** Recover a planar parallelogram from its four panorama rays. */
export function screenPlane(corners: PanoramaVideoConfig['corners']) {
  const rays = corners.map(({pitch,yaw}): Vec => [Math.cos(pitch*rad)*Math.sin(yaw*rad),Math.sin(pitch*rad),Math.cos(pitch*rad)*Math.cos(yaw*rad)]);
  const [r0,r1,r2,r3] = rays;
  const mid = scale(r2,-1);
  const det = dot(r1,cross(mid,r3));
  if (Math.abs(det)<1e-8) return null;
  const d1 = dot(r0,cross(mid,r3))/det;
  const d2 = dot(r1,cross(r0,r3))/det;
  const d3 = dot(r1,cross(mid,r0))/det;
  if (Math.min(d1,d2,d3)<=0) return null;
  return { origin:r0, right:sub(scale(r1,d1),r0), down:sub(scale(r3,d3),r0) };
}

/** Homogeneous projection keeps the screen attached even across the near plane. */
export function projectScreen(plane: NonNullable<ReturnType<typeof screenPlane>>, pitch: number, yaw: number, hfov: number, width: number, height: number) {
  const cp=Math.cos(pitch*rad), sp=Math.sin(pitch*rad), cy=Math.cos(yaw*rad), sy=Math.sin(yaw*rad);
  const focal=width/(2*Math.tan(hfov*rad/2));
  const project=(v:Vec): Vec => {
    const x=cy*v[0]-sy*v[2];
    const z=sy*v[0]+cy*v[2];
    const y=cp*v[1]-sp*z;
    const depth=sp*v[1]+cp*z;
    return [focal*x+width/2*depth,-focal*y+height/2*depth,depth];
  };
  const o=project(plane.origin), a=project(plane.right), b=project(plane.down);
  const corners=[o,[o[0]+a[0],o[1]+a[1],o[2]+a[2]],[o[0]+a[0]+b[0],o[1]+a[1]+b[1],o[2]+a[2]+b[2]],[o[0]+b[0],o[1]+b[1],o[2]+b[2]]];
  const visible = !corners.every(p=>p[2]<=0) && !corners.every(p=>p[0]<0) && !corners.every(p=>p[0]>width*p[2]) && !corners.every(p=>p[1]<0) && !corners.every(p=>p[1]>height*p[2]);
  const matrix=[a[0]/1920,a[1]/1920,0,a[2]/1920,b[0]/1080,b[1]/1080,0,b[2]/1080,0,0,1,0,o[0],o[1],0,o[2]];
  return {visible, transform:'matrix3d('+matrix.join(',')+')'};
}
