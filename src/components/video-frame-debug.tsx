'use client';

import { useEffect, useRef, useState, type RefObject, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { PanoramaVideoConfig } from '@/lib/tour-types';
import { screenPlane } from '@/lib/panorama-video-projection';
import { useTourStore } from '@/lib/tour-store';

type Corners=PanoramaVideoConfig['corners'];
type Viewer={getPitch:()=>number;getYaw:()=>number;getHfov:()=>number;stopAutoRotate?:()=>void;lookAt?:(pitch:number,yaw:number,hfov:number,speed?:number|boolean)=>void};
const names=['Superior izquierda','Superior derecha','Inferior derecha','Inferior izquierda'];
const rad=Math.PI/180;
const buttonStyle:CSSProperties={background:'#303d4b',color:'white',border:'1px solid #607080',borderRadius:6,padding:'7px 10px',cursor:'pointer'};

export default function VideoFrameDebug({screen,corners,onChange,viewerRef,hostRef,transitioning,opacity,onOpacity}:{
  screen:PanoramaVideoConfig;corners:Corners;onChange:(corners:Corners)=>void;
  viewerRef:RefObject<Viewer|null>;hostRef:RefObject<HTMLDivElement|null>;transitioning:boolean;
  opacity:number;onOpacity:(opacity:number)=>void;
}) {
  const sceneId=useTourStore(s=>s.currentSceneId);
  const sceneName=useTourStore(s=>s.selectedApartment?.scenes.find(scene=>scene.id===s.currentSceneId)?.name ?? s.currentSceneId);
  const key='tv-frame-v1:'+screen.src+':'+sceneId+':'+(screen.variantId??'default');
  const [editing,setEditing]=useState(false);
  const [message,setMessage]=useState('');
  const [exportText,setExportText]=useState('');
  const handles=useRef<(HTMLButtonElement|null)[]>([]);
  const polygon=useRef<SVGPolygonElement>(null);
  const drag=useRef<{index:number;id:number}|null>(null);

  useEffect(()=>{
    try {
      const saved=JSON.parse(localStorage.getItem(key)??'null');
      if(Array.isArray(saved)&&saved.length===4&&saved.every(p=>p&&Number.isFinite(p.pitch)&&Math.abs(p.pitch)<90&&Number.isFinite(p.yaw))&&screenPlane(saved as Corners)) onChange(saved as Corners);
    } catch { /* An unavailable or old draft must not break the viewer. */ }
  },[key,onChange]);

  const point=(corner:Corners[number])=>{
    const v=viewerRef.current,rect=hostRef.current?.getBoundingClientRect();
    if(!v||!rect)return null;
    const y=(corner.yaw-v.getYaw())*rad,p=corner.pitch*rad,cp=Math.cos(v.getPitch()*rad),sp=Math.sin(v.getPitch()*rad);
    const x=Math.cos(p)*Math.sin(y),z=Math.cos(p)*Math.cos(y),h=Math.sin(p);
    const depth=sp*h+cp*z;
    if(depth<=0.001)return null;
    const f=rect.width/(2*Math.tan(v.getHfov()*rad/2));
    return {x:rect.left+rect.width/2+f*x/depth,y:rect.top+rect.height/2-f*(cp*h-sp*z)/depth};
  };
  const unproject=(x:number,y:number)=>{
    const v=viewerRef.current!,rect=hostRef.current!.getBoundingClientRect();
    const f=rect.width/(2*Math.tan(v.getHfov()*rad/2));
    const dx=(x-rect.left-rect.width/2)/f,dy=-(y-rect.top-rect.height/2)/f;
    const p=v.getPitch()*rad,yaw=v.getYaw()*rad;
    const height=Math.cos(p)*dy+Math.sin(p),forward=Math.cos(p)-Math.sin(p)*dy;
    const wx=Math.cos(yaw)*dx+Math.sin(yaw)*forward,wz=-Math.sin(yaw)*dx+Math.cos(yaw)*forward;
    return {yaw:Math.atan2(wx,wz)/rad,pitch:Math.atan2(height,Math.hypot(wx,wz))/rad};
  };

  useEffect(()=>{
    if(!editing)return;
    let frame=0;
    const draw=()=>{
      const positions=corners.map(point);
      handles.current.forEach((el,i)=>{if(!el)return;const p=positions[i];el.style.display=p&&!transitioning?'block':'none';if(p){el.style.left=p.x+'px';el.style.top=p.y+'px';}});
      if(polygon.current){polygon.current.style.display=positions.every(Boolean)&&!transitioning?'block':'none';polygon.current.setAttribute('points',positions.filter(Boolean).map(p=>p!.x+','+p!.y).join(' '));}
      frame=requestAnimationFrame(draw);
    };
    frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);
  },[editing,corners,transitioning,viewerRef,hostRef]);

  function save(next:Corners) {
    if(!screenPlane(next)){setMessage('Las esquinas no pueden cruzarse. Ajusta un poco menos.');return;}
    onChange(next);setExportText('');
    try{localStorage.setItem(key,JSON.stringify(next));setMessage('Borrador guardado en este navegador.');}catch{setMessage('Ajuste temporal: copia los valores antes de salir.');}
  }
  function move(index:number,x:number,y:number){
    const next=corners.map(p=>({...p})) as Corners;
    const p=unproject(x,y);next[index]={yaw:+p.yaw.toFixed(5),pitch:+p.pitch.toFixed(5)};save(next);
  }
  function enable(){
    setEditing(!editing);
    if(!editing){useTourStore.setState({autoRotate:false});viewerRef.current?.stopAutoRotate?.();}
    else onOpacity(1);
  }
  function center(){
    useTourStore.setState({autoRotate:false});const v=viewerRef.current;v?.stopAutoRotate?.();
    const plane=screenPlane(corners);if(!plane)return;
    const p=plane.origin.map((n,i)=>n+(plane.right[i]+plane.down[i])/2);
    v?.lookAt?.(Math.atan2(p[1],Math.hypot(p[0],p[2]))/rad,Math.atan2(p[0],p[2])/rad,110,false);
  }
  async function copy(){
    const text='// '+sceneName+' ('+sceneId+')'+(screen.variantId?' — '+screen.variantId:'')+'\n'+'corners: [\n'+corners.map(p=>'  { yaw: '+p.yaw.toFixed(5)+', pitch: '+p.pitch.toFixed(5)+' },').join('\n')+'\n],';
    setExportText(text);
    try{await navigator.clipboard.writeText(text);setMessage('Valores copiados. Pégalos en el chat.');}catch{setMessage('Selecciona y copia el texto de abajo.');}
  }

  return createPortal(<>
    {editing&&<>
      <svg aria-hidden style={{position:'fixed',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:301}}><polygon ref={polygon} fill="none" stroke="#00f4dc" strokeWidth="2" strokeDasharray="6 4" /></svg>
      {names.map((name,i)=><button key={name} ref={el=>{handles.current[i]=el;}} type="button" aria-label={'Esquina TV: '+name}
        onPointerDown={e=>{e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);drag.current={index:i,id:e.pointerId};}}
        onPointerMove={e=>{if(drag.current?.id===e.pointerId){e.preventDefault();e.stopPropagation();move(i,e.clientX,e.clientY);}}}
        onPointerUp={e=>{e.stopPropagation();drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
        onPointerCancel={()=>{drag.current=null;}}
        onKeyDown={e=>{const d:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(!d[e.key])return;e.preventDefault();e.stopPropagation();const p=point(corners[i]);if(p)move(i,p.x+d[e.key][0]*(e.shiftKey?10:1),p.y+d[e.key][1]*(e.shiftKey?10:1));}}
        style={{position:'fixed',display:'none',transform:'translate(-50%,-50%)',zIndex:302,width:30,height:30,borderRadius:'50%',border:'2px solid white',background:'#007c72',color:'white',fontWeight:700,cursor:'grab',touchAction:'none'}}>{i+1}</button>)}
    </>}
    <section aria-label="Calibrar televisor" style={{position:'fixed',right:12,top:110,zIndex:303,width:editing?'min(310px, calc(100vw - 24px))':'auto',maxHeight:'65vh',overflowY:'auto',background:'#111c26f5',color:'white',border:'1px solid #00bfae',borderRadius:10,padding:12,fontSize:12}}>
      <button type="button" onClick={enable} style={buttonStyle}>{editing?'Terminar ajuste TV':'Ajustar marco TV'}</button>
      {editing&&<>
        <p style={{margin:'10px 0'}}>{sceneName}. Arrastra las cuatro esquinas. Usa las flechas para afinar; Shift mueve 10 px.</p>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <button type="button" style={buttonStyle} onClick={center}>Ver televisor completo</button>
          <button type="button" style={buttonStyle} onClick={copy}>Copiar marco TV</button>
          <button type="button" style={buttonStyle} onClick={()=>{onChange(screen.corners);try{localStorage.removeItem(key);}catch{}setExportText('');setMessage('Restaurado al marco de la configuración.');}}>Restaurar marco</button>
        </div>
        <label style={{display:'block',marginTop:10}}>Opacidad del video: {Math.round(opacity*100)}%<input aria-label="Opacidad del video" type="range" min="0" max="100" value={Math.round(opacity*100)} onChange={e=>onOpacity(+e.target.value/100)} style={{width:'100%'}} /></label>
        <ol style={{paddingLeft:20,margin:'8px 0'}}>{corners.map((p,i)=><li key={i}>{names[i]}: {p.yaw.toFixed(3)} / {p.pitch.toFixed(3)}</li>)}</ol>
        <p role="status">{message}</p>
        {exportText&&<textarea aria-label="Valores del marco TV" readOnly value={exportText} onFocus={e=>e.currentTarget.select()} style={{width:'100%',height:150,background:'#07121d',color:'white',fontFamily:'monospace',fontSize:11}} />}
      </>}
    </section>
  </>,document.body);
}
