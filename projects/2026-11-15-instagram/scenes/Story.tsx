import React from 'react';
import { Img, Sequence, staticFile, useCurrentFrame, interpolate } from 'remotion';
import { Scene, ScreenPlate, FitText, color, type, radius, tokens, anim, motion, ease, dur, PAGE_PAD, safe } from '../../../core';
import type { EditableLayer } from '../../../core';

const root = '2026-11-15-instagram';
const asset = (name: string) => `${root}/assets/${name}`;
const lerp = (f: number, a: number, b: number, x = 0, y = 1) => interpolate(f, [a,b], [x,y], {easing:ease.fill, extrapolateLeft:'clamp', extrapolateRight:'clamp'});
const shadow = tokens.extra?.shadow as {object: string; card: string};
const ink: React.CSSProperties = {fontFamily:type.body.family, color:color.text};
const label: React.CSSProperties = {...ink,fontSize:type.small.size,lineHeight:type.small.lh};

/** One hero continues moving through the entire block, including its last five frames. */
const Living: React.FC<{frames:number; children:React.ReactNode; seed?:string}> = ({frames,children,seed='hero'}) => {
  const f=useCurrentFrame(); const d=motion.drift(f,seed,8);
  return <div style={{position:'relative',width:900,height:1000,transform:`translate(${d.x}px,${d.y}px) scale(${1+f/frames*.035})`,transformOrigin:'50% 45%'}}>{children}</div>;
};
const Photo: React.FC<{name:string;w:number;h:number;style?:React.CSSProperties;mono?:boolean}> = ({name,w,h,style,mono=false}) => <div style={{width:w,height:h,padding:12,background:color.bgTop,borderRadius:radius.card,boxShadow:shadow.object,...style}}><div style={{width:'100%',height:'100%',overflow:'hidden',borderRadius:radius.icon}}><Img src={staticFile(asset(name))} style={{width:'100%',height:'100%',objectFit:'cover',filter:mono?'grayscale(1)':undefined}}/></div></div>;
const Chip: React.FC<{children:React.ReactNode;style?:React.CSSProperties}> = ({children,style}) => <div style={{...label,padding:'20px 28px',borderRadius:radius.card,background:color.card,border:`2px solid ${color.line}`,boxShadow:shadow.card,...style}}>{children}</div>;
const Rule: React.FC<{progress:number;y:number}> = ({progress,y}) => <div style={{position:'absolute',left:10,top:y,width:860,height:6,background:color.line}}><div style={{height:'100%',width:`${progress*100}%`,background:color.accent}}/></div>;

const Hook:React.FC=()=>{
 const f=useCurrentFrame();const remove=lerp(f,12,12+dur.fillLong);
 return <Living frames={120} seed="hook">
  <Photo name="bridge.jpg" w={580} h={540} style={{position:'absolute',left:140,top:180,transform:`scale(${.9+.1*remove})`}}/>
  {['Места','Планы','Встречи'].map((t,i)=><Chip key={t} style={{position:'absolute',left:70+i*180,top:100+i*180,opacity:1-remove,transform:`translateX(${(i%2?1:-1)*remove*800}px)`}}>{t}</Chip>)}
  <Img src={staticFile(asset('old-icon.png'))} style={{position:'absolute',width:190,height:190,left:600,top:600,borderRadius:radius.card,boxShadow:shadow.object}}/>
  <Img src={staticFile(asset('instagram-wordmark.svg'))} style={{position:'absolute',left:250,top:800,width:390,height:132,objectFit:'contain'}}/>
 </Living>;
};
const Founders:React.FC=()=>{
 const f=useCurrentFrame();const p=anim.grow(f,42,dur.fillLong);
 return <Living frames={270} seed="founders">
  <Photo name="kevin.jpg" w={365} h={450} mono style={{position:'absolute',left:20,top:20}}/>
  <Photo name="mike.jpg" w={365} h={450} mono style={{position:'absolute',left:480,top:20}}/>
  <div style={{position:'absolute',left:20,top:510,...label}}>Кевин Систром</div><div style={{position:'absolute',left:480,top:510,...label}}>Майк Кригер</div>
  <div style={{position:'absolute',top:650,left:20,width:830,opacity:p,transform:`translateY(${(1-p)*24}px)`}}>
   <Chip style={{display:'flex',gap:26,alignItems:'center'}}><Img src={staticFile(asset('map-pin.svg'))} style={{width:64,height:64}}/><span>Отметить место</span><Img src={staticFile(asset('arrow-right.svg'))} style={{width:56,height:56}}/><Img src={staticFile(asset('camera.svg'))} style={{width:64,height:64}}/><span>Добавить фото</span></Chip>
   <div style={{...label,color:color.textMuted,marginTop:28}}>Burbn · схема приложения</div>
  </div>
 </Living>;
};
const Focus:React.FC=()=>{
 const f=useCurrentFrame();const crop=lerp(f,0,42,790,590);const filter=lerp(f,54,54+dur.fillLong);const publish=lerp(f,110,145);
 return <Living frames={180} seed="focus">
  <div style={{position:'absolute',left:(900-crop)/2,top:70,width:crop,height:590,padding:14,background:color.bgTop,borderRadius:radius.card,boxShadow:shadow.object,overflow:'hidden',transform:`translateY(${-40*publish}px) scale(${1-.08*publish})`}}>
   <Img src={staticFile(asset('bridge.jpg'))} style={{width:'100%',height:'100%',objectFit:'cover',filter:`sepia(${filter*.7}) saturate(${1-filter*.25})`}}/>
  </div>
  <div style={{position:'absolute',top:710,left:50,display:'flex',gap:20}}>{['Снимок','Фильтр','Публикация'].map((t,i)=><Chip key={t} style={{color:(i===1&&f>=54&&f<110)||(i===2&&f>=110)?color.accent:color.textMuted}}>{t}</Chip>)}</div>
  <div style={{position:'absolute',top:850,left:80,width:740,height:7,background:color.line}}><div style={{width:`${lerp(f,54,179)*100}%`,height:'100%',background:color.accent}}/></div>
 </Living>;
};
const Launch:React.FC=()=>{
 const f=useCurrentFrame();const grow=lerp(f,105,117);const n=Math.round(anim.counter(f,25000,0,105,95));
 return <Living frames={240} seed="launch">
  <div style={{position:'absolute',left:220-160*grow,top:10+230*grow,transform:`scale(${1-.35*grow})`,transformOrigin:'0 0'}}><ScreenPlate src={asset('early-screen.png')} width={460} aspect={2/3} zoom={.06}/></div>
  <div style={{position:'absolute',left:390,top:280,opacity:grow,...ink}}><div style={{fontSize:type.stat.size,fontWeight:type.stat.weight,letterSpacing:type.stat.ls,color:color.accent}}>{n.toLocaleString('ru-RU')}</div><div style={{...label,marginTop:20}}>пользователей<br/>за первый день</div></div>
  <div style={{position:'absolute',left:390,top:650,display:'grid',gridTemplateColumns:'repeat(3, 100px)',gap:18,opacity:grow}}>{Array.from({length:9},(_,i)=><div key={i} style={{...anim.enter(f,110+i*8),width:100,height:100,borderRadius:radius.icon,overflow:'hidden'}}><Img src={staticFile(asset('bridge.jpg'))} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:`${(i%3)*50}% ${Math.floor(i/3)*50}%`,filter:`grayscale(${i%2})`}}/></div>)}</div>
 </Living>;
};
const Deal:React.FC=()=>{
 const f=useCurrentFrame();const snap=lerp(f,150-dur.enter,150);
 return <Living frames={300} seed="deal">
  <div style={{position:'absolute',top:150,left:10,opacity:1-lerp(f,130,150),transform:`translateY(${-60*lerp(f,130,150)}px)`}}><ScreenPlate src={`${root}/shots/acquisition-excerpt.png`} width={860} aspect={984.5/376.1875} pan={{from:{x:.5,y:.15,scale:1},to:{x:.5,y:.6,scale:1.15},frames:150}}/></div>
  <div style={{position:'absolute',top:140,left:80,width:730,display:'flex',alignItems:'center',justifyContent:'space-between',opacity:snap}}>
   <Img src={staticFile(asset('facebook.svg'))} style={{width:340,height:110,objectFit:'contain',transform:`translateX(${-80*(1-snap)}px)`}}/>
   <div style={{width:100,height:3,background:color.accent}}/>
   <Img src={staticFile(asset('old-icon.png'))} style={{width:210,height:210,objectFit:'contain',transform:`translateX(${80*(1-snap)}px)`}}/>
  </div>
  <div style={{position:'absolute',left:80,top:460,opacity:snap,...ink,fontSize:type.stat.size,fontWeight:type.stat.weight,color:color.accent}}>≈ $1 млрд</div>
  <Rule progress={lerp(f,160,299)} y={750}/>
  <div style={{position:'absolute',top:790,left:10,...label}}>Октябрь 2010</div><div style={{position:'absolute',top:790,right:30,...label}}>Апрель 2012</div>
 </Living>;
};
const Stories:React.FC=()=>{
 const f=useCurrentFrame();const disappear=lerp(f,138,138+dur.enter);const index=f<60?0:f<100?1:2;
 return <Living frames={180} seed="stories">
  <div style={{position:'absolute',left:180,top:0,transform:`scale(${1-disappear*.12})`,opacity:1-disappear}}>
   <ScreenPlate src={asset(['story-pizza.jpg','story-friends.jpg','story-dog.jpg'][index])} width={500} aspect={537/902} zoom={.06}/>
  </div>
  <div style={{position:'absolute',top:270,left:120,opacity:disappear,...ink,fontSize:type.stat.size,fontWeight:type.stat.weight,color:color.accent}}>24 часа</div>
  <div style={{position:'absolute',top:500,left:200,opacity:disappear,...label}}>История исчезает</div>
  <Rule progress={Math.min(1,f/138)} y={900}/>
 </Living>;
};
const Reels:React.FC=()=>{
 const f=useCurrentFrame();const swipe=lerp(f,48,48+dur.fillLong);
 return <Living frames={180} seed="reels">
  <div style={{position:'absolute',left:10,top:40+70*swipe,transform:`scale(${.95-.2*swipe})`,transformOrigin:'0 0',opacity:1-.25*swipe}}><ScreenPlate src={asset('reels-camera.jpg')} width={410} aspect={750/1450} zoom={.06}/></div>
  <div style={{position:'absolute',left:480-80*swipe,top:80-60*swipe,transform:`scale(${.85+.15*swipe})`,transformOrigin:'0 0'}}><ScreenPlate src={asset('reels-feed.jpg')} width={410} aspect={750/1610} zoom={.06}/></div>
 </Living>;
};
const Evolution:React.FC<{ending?:boolean}>=({ending=false})=>{
 const f=useCurrentFrame();const active=ending?Math.min(2,Math.max(0,Math.floor((f-24)/60))):-1;
 const frames=210;
 return <Living frames={frames} seed={ending?'question':'evolution'}>
  {['early-screen.png','story-pizza.jpg','reels-feed.jpg'].map((name,i)=>{
   const show=ending?1:anim.grow(f,i===0?0:84+(i-1)*36,dur.fill);
   const lift=ending?-35*lerp(f,24+i*60,24+i*60+dur.enter)*(i===2?1:1-lerp(f,24+(i+1)*60-dur.enter,24+(i+1)*60)):0;
   const width=250;const aspect=i===0?2/3:i===1?537/902:750/1610;
   return <div key={name} style={{position:'absolute',left:10+i*300,top:180+lift,opacity:show,transform:`translateY(${(1-show)*50}px)`,filter:ending&&active!==i?'grayscale(.75)':undefined}}>
    <ScreenPlate src={asset(name)} width={width} aspect={aspect} zoom={.06}/>
    <div style={{...label,marginTop:34,textAlign:'center',color:active===i?color.accent:color.text}}>{['Фото','Stories','Reels'][i]}</div>
   </div>;
  })}
  <div style={{position:'absolute',left:420,top:890,width:28,height:28,background:color.accent,transform:`scale(${1+f/frames*.3})`}}/>
 </Living>;
};

const renderers=[Hook,Founders,Focus,Launch,Deal,Stories,Reels,Evolution,()=> <Evolution ending/>];
export const Story:React.FC<{index:number}>=({index})=>{const Component=renderers[index];return <Scene><div style={{position:'relative',marginTop:250,width:900,height:1000}}><Component/></div></Scene>};

const heading=(text:string,from=0,frames?:number):EditableLayer=>({id:`title-${from}`,kind:'text',text,x:PAGE_PAD,y:safe.top+10,width:900,fontSize:type.heroTight.size,fontFamily:type.heroTight.family,fontWeight:type.heroTight.weight,color:color.text,from,frames});
const note=(text:string):EditableLayer=>({id:'note',kind:'text',text,x:PAGE_PAD,y:1510,width:900,fontSize:type.small.size,fontFamily:type.small.family,fontWeight:type.small.weight,color:color.textMuted});
export const storyLayers:EditableLayer[][]=[
 [heading('НАЧАЛИ\nС УПРОЩЕНИЯ')],
 [heading('ДВА ОСНОВАТЕЛЯ.\nОДИН ПОВОРОТ.'),note('Портреты: 2013 / 2018. Схема Burbn — реконструкция.')],
 [heading('ФОТО → ФИЛЬТР →\nПУБЛИКАЦИЯ'),note('Демонстрация принципа работы')],
 [heading('6 ОКТЯБРЯ\n2010',0,105),heading('ПЕРВЫЙ ДЕНЬ\nINSTAGRAM',105,135)],
 [heading('СОГЛАШЕНИЕ\nС FACEBOOK'),note('Объявлено 9 апреля 2012 · деньги и акции')],
 [heading('STORIES\n2016'),note('Фото и видео, исчезающие через сутки')],
 [heading('REELS\n2020'),note('Широкий запуск · короткие видео с музыкой и эффектами')],
 [heading('ОТ ФОТО —\nК ИСТОРИЯМ И ВИДЕО')],
 [heading('С ЧЕГО НАЧАЛСЯ\nВАШ INSTAGRAM?')],
];
