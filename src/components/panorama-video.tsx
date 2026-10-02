'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { PanoramaVideoConfig } from '@/lib/tour-types';
import { projectScreen, screenPlane } from '@/lib/panorama-video-projection';
import dynamic from 'next/dynamic';
const VideoFrameDebug = process.env.NODE_ENV !== 'production'
  ? dynamic(() => import('./video-frame-debug'), { ssr: false })
  : () => null;

type Viewer = { getPitch:()=>number; getYaw:()=>number; getHfov:()=>number; isLoaded?:()=>boolean };

export default function PanoramaVideo({ screen, viewerRef, transitioning }: {
  screen: PanoramaVideoConfig;
  viewerRef: RefObject<Viewer | null>;
  transitioning: boolean;
}) {
  const hostRef=useRef<HTMLDivElement>(null);
  const videoRef=useRef<HTMLVideoElement>(null);
  const screenRef=useRef<HTMLButtonElement>(null);
  const [visible,setVisible]=useState(false);
  const [playing,setPlaying]=useState(false);
  const [muted,setMuted]=useState(true);
  const [failed,setFailed]=useState(false);
  const blocked=useRef(false);
  const debugEnabled=process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug')==='1';
  const [corners,setCorners]=useState(screen.corners);
  const [debugOpacity,setDebugOpacity]=useState(1);

  useEffect(()=>{
    const video=videoRef.current, host=hostRef.current;
    const plane=screenPlane(corners);
    if(!video || !host || !plane) return;
    let raf=0, wasVisible=false, pending=false, disposed=false;
    const tick=()=>{
      const viewer=viewerRef.current;
      let on=false;
      if(viewer && !transitioning && !document.hidden && (viewer.isLoaded?.() ?? true)) {
        const p=projectScreen(plane,viewer.getPitch(),viewer.getYaw(),viewer.getHfov(),host.clientWidth,host.clientHeight);
        if(screenRef.current) screenRef.current.style.transform=p.transform;
        on=p.visible;
      }
      if(screenRef.current) screenRef.current.style.visibility=on?'visible':'hidden';
      if(on!==wasVisible) { wasVisible=on; setVisible(on); }
      if(on && video.paused && !pending && !blocked.current && !video.error) {
        pending=true;
        void video.play().then(()=>{if(disposed) video.pause();}).catch(()=>{if(!disposed) blocked.current=true;}).finally(()=>{pending=false;});
      } else if(!on && !video.paused) video.pause();
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>{disposed=true; cancelAnimationFrame(raf); video.muted=true; video.pause();};
  },[screen,corners,viewerRef,transitioning]);

  async function toggleAudio() {
    const video=videoRef.current;
    if(!video) return;
    blocked.current=false;
    const next=!video.muted;
    video.muted=next;
    setMuted(next);
    try {await video.play();} catch {blocked.current=true;}
  }

  // Listen on the panorama ancestor so dragging the TV still rotates the view.
  useEffect(()=>{
    const host=hostRef.current?.parentElement;
    if(!host) return;
    let down: {x:number;y:number;id:number;inside:boolean;moved:boolean}|null=null;
    const inside=(x:number,y:number)=>{
      const button=screenRef.current;
      const overlay=hostRef.current;
      if(!button || !overlay || button.style.visibility!=='visible' || transitioning || failed) return false;
      const rect=overlay.getBoundingClientRect();
      const inverse=new DOMMatrix(button.style.transform).inverse();
      const p=new DOMPoint(x-rect.left,y-rect.top).matrixTransform(inverse);
      return p.w>0 && p.x/p.w>=0 && p.x/p.w<=1920 && p.y/p.w>=0 && p.y/p.w<=1080;
    };
    const onDown=(e:PointerEvent)=>{if(e.isPrimary && e.button===0) down={x:e.clientX,y:e.clientY,id:e.pointerId,inside:inside(e.clientX,e.clientY),moved:false};};
    const onMove=(e:PointerEvent)=>{if(down && e.pointerId===down.id && Math.hypot(e.clientX-down.x,e.clientY-down.y)>6) down.moved=true;};
    const onUp=(e:PointerEvent)=>{
      const start=down; down=null;
      if(start && e.pointerId===start.id && start.inside && !start.moved && inside(e.clientX,e.clientY)) void toggleAudio();
    };
    const cancel=()=>{down=null;};
    host.addEventListener('pointerdown',onDown,true);
    host.addEventListener('pointermove',onMove,true);
    host.addEventListener('pointerup',onUp,true);
    host.addEventListener('pointercancel',cancel,true);
    return ()=>{
      host.removeEventListener('pointerdown',onDown,true);
      host.removeEventListener('pointermove',onMove,true);
      host.removeEventListener('pointerup',onUp,true);
      host.removeEventListener('pointercancel',cancel,true);
    };
  },[transitioning,failed]);

  return <div ref={hostRef} style={{position:'absolute',inset:0,zIndex:3,pointerEvents:'none',overflow:'hidden'}}>
    <button ref={screenRef} type="button" onClick={()=>void toggleAudio()} disabled={failed || !visible || transitioning}
      aria-label={failed?'Video no disponible':muted?'Activar sonido del televisor':'Silenciar televisor'}
      aria-pressed={!muted} title={muted?'Haz clic en el televisor para activar el sonido':'Haz clic para silenciar'}
      style={{position:'absolute',left:0,top:0,width:1920,height:1080,maxWidth:'none',transformOrigin:'0 0',visibility:'hidden',pointerEvents:'none',padding:0,border:0,background:'transparent'}}>
      <video ref={videoRef} src={screen.src} muted={muted} loop playsInline preload="metadata"
        onPlaying={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>setFailed(true)}
        onVolumeChange={()=>{if(videoRef.current) setMuted(videoRef.current.muted);}}
        aria-label="Video de Tierra Linda en el televisor"
        style={{display:'block',width:'100%',height:'100%',opacity:playing?debugOpacity:0,objectFit:'contain',background:'#000'}} />
    </button>
    {debugEnabled && <VideoFrameDebug screen={screen} corners={corners} onChange={setCorners} viewerRef={viewerRef} hostRef={hostRef} transitioning={transitioning} opacity={debugOpacity} onOpacity={setDebugOpacity} />}
  </div>;
}
