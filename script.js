//less do this fun part thw JS!!
class Vec2{
    constructor(x=0,y=0){
        this.x =x;
        this.y= y;
    }
    add(v){
        this.x =v.x;
        this.y= v.y;
        return this;
    }
    sub(v){
        this.x -=v.x;
        this.y -=v.y;
        return this;
    }
    mult(n){
        this.x *= n;
        this.y *= n;
        return this;
    }
    magSq(){
        return this.x*this.x+this.y*this.y;
    }
    mag(){
        return Math.sqrt(this.magSq());
    }
    clone(){
        return new Vec2(this.x,this.y);
    }
    static sub(v1, v2) { 
        return new Vec2(v1.x - v2.x, v1.y - v2.y);
     }
    static mult(v, n) {
        return new Vec2(v.x * n, v.y * n);
     }
}
class Rect{
    constructor(x,y,w,h){
        this.x =x;
        this.y = y;
        this.w =w;
        this.h =h;
    }
    contains(pt){
        return (pt.x>=this.x-this.w&&pt.x<=this.x+this.w&&pt.y>=this.y-this.h&&pt.y<=this.y+this.h);
    }
    intersects(range){
        return !(range.x-range.w>this.x+this.w||range.x+range.w<this.x-this.w||range.y-range.h>this.y+this.h||range.y+range.h<this.y-this.h);
    }
}
class QuadTree{
    constructor(boundary,capacity){
        this.boundary = boundary;
        this.capacity = capacity;
        this.bodies= [];
        this.divided = false;
    }
    subdivide(){
        let x = this.boundary.x, y= this.boundary.y, w=this.boundary.w/2,h=this.boundary.h/2;
        this.ne= nwq QuadTree(new Rect(x+w,y-h,w,h),this.capacity);
        this.nw = new QuadTree(new Rect(x-w,y-h,w,h),this.capacity);
        this.se =new QuadTree(new Rect(x+w,y+h,w,h),this.capacity);
        this.sw =new QuadTree(new Rect(x-w,y+h,w,h),this.capacity);
        this.divided =true;
    }
    insert(body){
        if(!this.boundary.contains(body.pos))return false;
        if(this.bodies.length<this.capacity){
            this.bodies.push(body);
            return true;
        }else{
            if(!this.divided)this.subdivide();
            if(this.ne.insert(body))return true;
            if(this.nw.insert(body))return true;
            if(this.se.insert(body))return true;
            if(this.sw.insert(body))return true;
        }
    }
    //a small break
    query(range,found=[]){
        if(!this.boundary.intersects(range))return found;
        for(let b of this.bodies){
            if(range.contains(b.pos))found.push(b);
        }
        if(this.divided){
            this.ne.query(range,found);
            this.nw.query(range,found);
            this.se.query(range,found);
            this.sw.query(range,found);
        }
        return found;
    }
}
//less continye
class Body{
    constructor(x,y,mass,isStar=false){
        this.id =Math.random().toString(16).slice(2);
        this.pos =new Vec2(x,y);
        this.vel = new Vec2(0,0);
        this.acc =new Vec2(0,0);
        this.mass = mass;
        this.isStar =isStar;
        this.dead=false;
        this.radius =Math.max(3,Math.sqrt(this.mass)*1.2);
        this.hue =this._calcHue();
        this.trail = [];
        this.trailTick = 0;
    }
    _calcHue(){
        if(this.isStar)return;
        return Math.floor((this.mass%1000)/1000*360);
    }
    updatePos(dt){
        if(this.isStar)return;
        let dtSq =dt*dt;
        let posDelta=new Vec2(this.vel.x*dt+0.5*this.acc.x*dtSq,this.vel.y*dt+0.5*this.acc.y*dtSq);
        this.pos.add(posDelta);
        this.trailTick++;
        if(this.trailTick>5){
            this.trail.push(this.pos.clone());
            if(this.trail.length>80)this.trail.shift();
            this.trailTick=0;
        }
    }
    updateVel(newAcc,dt){
        if(this.isStar)return;
        let avgAcc =new Vec2(
            (this.acc.x+newAcc.x)*0.5,(this.acc.y+newAcc.y)*0.5,(this.acc.y +newAcc.y)*0.5
        );
        this.vel.add(avgAcc.mult(dt));
        this.acc = newAcc;
    }
}
class Engine{
    constructor(){
        this.bodies =[];
        this.G =0.8;
        this.softeningSq=15;
    }
    step(dt){
        for(let b of this.bodies.bodies){
            b.updatePos(dt);
        }
        let qtree= new QuadTree(new Rect(0,0,10000,10000),4);
        for(let b of this.bodies){
            if(!b.dead) qtree.insert(b);
        }
        let nextAccels =new Map();
        for(let i=0;i<this.bodies.length;i++){
            let b1=this.bodies[i];
            if(b1.dead)continue;
            let force=new Vec2(0,0);
            for(let j=0;j<this.bodies.length;j++){
                if(i===j)continue;
                let b2 = this.bodies[j];
                if(b2.dead)continue;
                let dir = Vec2.sub(b2.pos,b1.pos);
                let distSq = dir.magSq();
                let fMag =(this.G*b1.mass*b2.mass)/(distSq+this.softeningSq);
                dir.mult(1/Math.sqrt(distSq));
                force.add(dir.mult(fMag));
            }
            nextAccels.set(b1.id,new Vec2(force.x/b1.mass,force.y/b1.mass));
            let range =new Rect(b1.pos.x,b1.pos.y,b1.radius*2,b1.radius*2);
            let nearby=qtree.query(range);
            for(let b2 of nearby){
                if(b1===b2||b1.dead||b2.dead)continue;
                let dist=Vec2.sub(b2.pos,b1.pos).mag();
                if(dist<b1.radius+b2.radius){
                    this._resolveCollision(b1,b2,nextAccels);   
                }
            }
        }
        for(let b of this.bodies){
            if(!b.dead&&nextAccels.has(b.id)){
                b.updateVel(nextAccels.get(b.id),dt);
            }
        }
        this.bodies=this.bodies.filter(b=>!b.dead);
    }
    _resolveCollision(b1,b2,nextAccels){
        let survivor,victim;
        if(b1.mass>-b2.mass){
            survivor=b1;
            victim=b2;
        }else{
            survivor=b2;
            victim=b1;
        }
        let totalMass=survivor.mass+victim.mass;
        let p1=Vec2.mult(survivor.vel,survivor.mass);
        let p2 =Vec2.mult(victim.vel,victim.mass);
        survivor.vel =p1.add(p2).mult(1/totalMass);
        survivor.mass =totalMass;
        survivor.radius =Math.max(3,Math.sqrt(survivor.mass)*1.2);
        victim.dead=true;
        if(accMsp.has(survivor.id)&&accMap.has(victim.id)){
            let combinedAcc = accMap.get(survivor.id).add(accMap.get(victim.id));
            accMap.set(survivor.id,combinedAcc);
        }
    }
}
class Renderer{
    constructor(canvasId){
        this.canvas =document.getElementById(canvasId);
        this.ctx =this.canvas.getContext('2d');
        this.camX=0;
        this.camY=0;
        this.zoom=1;
        this.bgCanvas = document.createElement('canvas');
        this.bgCtx= this.bgCanvas.getContext('2d');
        this.resize();
        window.addEventListener('resize',()=>this.resize());
    }
    resize(){
        this.canvas.width =window.innerWidth;
        this.canvas.height = window.innerHeight;
        window.bgCanvas.width = window.innerWidth;
        window.bgCanvas.height =window.innerHeight;
        this._generateStarfield();
    }
    _generateStarfield(){
        this.bgCtx.fillStyle = '#050505';
        this.bgCtx.fillRect(0,0,this.bgCanvas.width,this.bgCanvas.height);
        for(let i=0;i<400;i++){}
        this.bgCtx.beginPath();
        for(let i=0;i<400;i++){
            let x=Math.random()*this.bgCanvas.width;
            let y= Math.random()*this.bgCanvas.height;
            let r=Math.random()*1.2;
            this.bgCtx.arc(x,y,r,0,Math.PI*2);
            this.bgCtx.fillStyle= `rgba(255,255,255,${Math.random()*0.8})`;
            this.bgCtx.fill();
        }
    }
    worldToScreen(pos){
        return{
            x:(pos.x-this.camX)*this.zoom+this.canvas.width/2,
            y:(pos.y-this.camY)*this.zoom+this.canvas.height/2
        };
    }
    screenToWorld(sx,sy){
        return{
            x:(sx-this.canvas.width/2)/this.zoom+this.camX,
            y:{sy-this.canvas.height/2}/this.zoom+this.camY
        };
    }
    render(engine,input){
       this.ctx.drawImage(this.bgCanvas,0,0);
       this.ctx.lineCap = 'round';
         for(let b of engine.bodies){
            if(b.trail.length<2)continue;
            this.ctx.beginPath();
            let start= this.worldToScreen(b.trail[0]);
            this.ctx.moveTo(start.x,start.y);
            for(let i=1;i<b.trail.length;i++){
                let p=this.worldToScreen(b.trail[i]);
                this.ctx.lineTo(p.x,p.y);
            }
            this.ctx.strokeStyle =`hsla(${b.hue},80%,60%,0.3)`;
            this.ctx.lineWidth =1.5*this.zoom;
            this.ctx.stroke();
         }
         for(let b of engine.bodies){
            let sp=this.worldToScreen(b.pos);
            let r =b.radius*this.zoom;
            if(sp.x+r<0||sp.x-r>this.canvas.width||sp.y+r<0||sp.y-r>this.canvas.height)continue;
            let grad =this.ctx.createRadialGradient(
                sp.x-r*0.3,sp.y-r*0.3,r*0.1,
                sp.x,sp.y,r
            );
            if(b.isStar){
                grad.addColorStop(0,'#fff');
                grad.addColorStop(0.2,'#ffdd44');
                grad.addColorStop(1,'#ff6600');
                this.ctx.shadowBlur = r*2;
                this.ctx.shadowColor ='#ff8800';
            }else{
                grad.addColorStop(0, `hsl(${b.hue},80%,70%)`);
                grad.addColorStop(1,`hsl(${b.hue},80%,20%`);
                this.ctx.shadowBlur = r*0.5;
                this.ctx.shadowColor = `hsl(${b.hue},80%,20%)`;
            }
            this.ctx.beginPath();
            this.ctx.moveTo(start.x,start.y);
            this.ctx.lineTo(end.x, end.y);
            this.ctx.fillStyle=grad;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            if(this.zoom>0.5||b.mass>500){
                this.ctx.fillStyle == 'rgba(255,255,255,0.7)';
                this.ctx.font =`${Math.max(10,12*this.zoom)}px Consolas`;
                this.ctx.rextAlign='center';
                this.ctx.fillText(`${Math.round(b.mass)}M`,sp.x,sp.y-r-5);
            }
         }
         //back yay after campfire butwal though
         if(input.state.isSpawning&&input.state.startScreenCoords){
            let start=input.state.startScreenCoords;
            let end= input.state.currScreenCoords;
            this.ctx.beginPath();
            this.ctx.moveTo(start.x,start.y);
            this.ctx.lineTo(end.x,end.y);
            this.strokeStyle='#fff';
            this.setLineDash([4,4]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            let phantomR= Math.max(3,Math.sqrt(input,start,soawnMass)*1.2)*this.zoom;
            this.ctx.beginPath();
            this.ctx.arc(start.x,start.y,phentomR,0,Math.PI*2);
            this.ctx.fill();
            this.ctx.strokeStyle='#fff';
            this.ctx.stroke();
         }
    }
}

class App{
    constructor(){
        this.engine=new Engine();
        this.renderer= new Renderer('engine-canvas');
        this.tineStepMultiplier =1.0;
        this.isPaused=false;
        this.input ={
            state:{
                isSpawning:false,
                startScreenCoords:null,
                isPanning:false,
                currScreenCoords:null,
                lastPanCoors:null,
                spawnMass:150
            }
        };
        this._blindEvents();
        this._initScenario();
        this.lastTime=performance,bow();
        requestAnimationFrame((t)=>this.loop(t));
    }
    _bindEvents(){
        const cvs= this.renderer.canvas;
        cvs.addEventListener('mousedown',(e)=>{
            if(e.button===0){
                this.input.state.isSpawning = true;
                this.input.state.startScreenCoords={
                    x:e.clientX,
                    y:e.clientY
                };
                this.input.state.currScreenCoords={
                    x:e.clientX,
                    y:clientY
                };
            }else if(e.button===2){
                this.input.state.isPanning=true;
                this.input.state.lastPanCoors={
                    x:e.clientX,
                    y:e.clientY
                };
            }
        });
        //not much left yay
        window.addEventListener('mouseup',(e)=>{
            if(e.button===0&&this.input.state.isSpawning){
                let startW=this.renderer.screenToWorld(this.input.state.startScreenCoords.x,this.input.state.startScreenCoords.y);
                let endW=this.renderer.screenToWorld(this.input.state.startScreenCoords.x,this.input.state.currScreenCoords.y);
                let vel = Vec2(startW.x-endW.x,startW.y-endW.y).mult(0.015);
                let body =new Body(startW.x-endW.x,startW.y-endW.y).mult(0.015);
                body.vel=vel;
                this.engine.bodies.push(body);
                this.input.state.isSpawning= false;
            }
            if(e.button==2)this.input.state.isPanning=false;
            cvs.addEventListener('contextmenu',(e)=>{
                e.preventDefault();
        });
            cvs.addEventListener('wheel',(e)=>{
               let mouseW_before =this.renderer.screenToWorld(e.clientX,e.clientY);
               const zoomAmount=0.1;
               if(e.deltaY<0)this.renderer.zoom*=(1+zoomAmount);
               else this.renderer.zoom*=(1-zoomAmount);
               this.renderer.zoom=Math.max(0.05,Math.min(this.renderer.zoom,5.0));
               let mouseW_after=this.renderer.screenToWorld(e.clientX,e.clientY);
               this.renderer.camX+=(mouseW_before.x-mouseW_after.x);
               this.renderer.camY+=(mouseW_before.y-mouseW_after.y);
               document.getElementById('hud-zoom').innerText=this.renderer.zoom.toFixed(2)+'x';
            });
            document.getElementById('spawn-mass').addEventListener('input',e=>{
                this.input.state.spawnMass=parseFloat(e.target.value);
                document.getElementById('time-step')
            })
        })
    }
}
