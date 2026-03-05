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
    }
}
