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
