(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const GRAVITY = 0.7;
  const FRICTION = 0.8;

  // Mapa grandão, 6000 px!
  const MAP_WIDTH = 9000;
  const MAP_HEIGHT = HEIGHT;

  const keys = { w:false, a:false, s:false, d:false, space:false };
  let mouse = {x:0, y:0, down:false};
  let cameraX = 0;

  class Player {
    constructor() {
      this.x = 50;
      this.y = HEIGHT - 100;
      this.width = 40;
      this.height = 60;
      this.velX = 0;
      this.velY = 0;
      this.speed = 8; // turbo player
      this.jumping = false;
      this.grounded = false;
      this.hp = 50;
      this.isDead = false;
      this.facingRight = true;
      this.sprites = {
        stand: '#0a74da',
        walk: '#0563af',
        shoot: '#004a8f',
        crouch: '#013f7a',
      };
      this.state = 'stand';
    }
    update(platforms) {
      if (keys.a) {
        this.velX = Math.max(this.velX - 0.8, -this.speed);
        this.facingRight = false;
        if(!this.jumping) this.state = 'walk';
      } else if (keys.d) {
        this.velX = Math.min(this.velX + 0.8, this.speed);
        this.facingRight = true;
        if(!this.jumping) this.state = 'walk';
      } else {
        this.velX *= FRICTION;
        if(Math.abs(this.velX) < 0.1) {
          this.velX = 0;
          if(!this.jumping) this.state = 'stand';
        }
      }

      if ((keys.w || keys.space) && !this.jumping && this.grounded) {
        this.jumping = true;
        this.grounded = false;
        this.velY = -16; // pulo mais forte
        this.state = 'stand';
      }

      if(keys.s && this.grounded) {
        this.state = 'crouch';
      }

      this.velY += GRAVITY;

      this.x += this.velX;
      this.y += this.velY;

      if(this.x < 0) this.x = 0;
      if(this.x + this.width > MAP_WIDTH) this.x = MAP_WIDTH - this.width;

      this.grounded = false;
      for(let plat of platforms){
        if(checkCollision(this, plat)){
          if(this.velY > 0){
            this.y = plat.y - this.height;
            this.velY = 0;
            this.grounded = true;
            this.jumping = false;
          }
        }
      }

      if(this.y + this.height > HEIGHT - 40){
        this.y = HEIGHT - 40 - this.height;
        this.velY = 0;
        this.grounded = true;
        this.jumping = false;
      }

      if(this.y < 0){
        this.y = 0;
        this.velY = 0;
      }
    }
    draw(cameraX) {
      ctx.fillStyle = this.sprites[this.state];
      ctx.save();
      if(!this.facingRight) {
        ctx.translate(this.x + this.width/2 - cameraX, 0);
        ctx.scale(-1,1);
        ctx.translate(-this.x - this.width/2 + cameraX, 0);
      }
      ctx.fillRect(this.x - cameraX, this.y, this.width, this.height);
      let centerX = this.x + this.width / 2 - cameraX;
      let centerY = this.y + this.height / 2;
      let angle = Math.atan2(mouse.y - centerY, mouse.x - centerX);
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);
      ctx.fillStyle = '#222';
      ctx.fillRect(0, -5, 30, 10);
      ctx.restore();
      ctx.fillStyle = 'red';
      ctx.fillRect(this.x - cameraX, this.y - 15, this.width, 5);
      ctx.fillStyle = 'limegreen';
      ctx.fillRect(this.x - cameraX, this.y - 15, this.width * (this.hp/50), 5);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(this.x - cameraX, this.y - 15, this.width, 5);
    }
    getHitBox() {
      return {x: this.x, y: this.y, width:this.width, height:this.height};
    }
  }

  class Enemy {
    constructor(x,y){
      this.x = x;
      this.y = y;
      this.width = 40;
      this.height = 50;
      this.hp = 3;
      this.isDead = false;
      this.speed = 2.5; // mais rápido
      this.velX = 0;
      this.velY = 0;
      this.grounded = false;
      this.shootCooldown = 0;
      this.facingRight = false;
      this.sprites = {
        stand: '#b22222',
        walk: '#8b1a1a',
        shoot: '#661111',
      };
      this.state = 'stand';
    }
    update(player, platforms) {
      if(this.isDead) return;

      let distX = player.x - this.x;
      let distY = Math.abs(player.y - this.y);

      if(distY < 60){
        this.facingRight = distX > 0;

        if(Math.abs(distX) < 400){ // alcance maior
          this.state = 'shoot';
          if(this.shootCooldown <= 0){
            this.shootCooldown = 50; // atira mais rápido
            let angle = Math.atan2(player.y + player.height/2 - (this.y + this.height/2), player.x + player.width/2 - this.x);
            let speed = 14;
            let vx = Math.cos(angle)*speed;
            let vy = Math.sin(angle)*speed;
            bullets.push(new Bullet(this.x + this.width/2, this.y + this.height/2, vx, vy, false));
          }
        } else {
          this.state = 'walk';
          this.velX = this.facingRight ? this.speed : -this.speed;
          this.x += this.velX;
        }
      } else {
        this.state = 'stand';
      }

      if(this.shootCooldown > 0) this.shootCooldown--;

      this.velY += GRAVITY;
      this.y += this.velY;

      this.grounded = false;
      for(let plat of platforms){
        if(checkCollision(this, plat)){
          if(this.velY > 0){
            this.y = plat.y - this.height;
            this.velY = 0;
            this.grounded = true;
          }
        }
      }

      if(this.y + this.height > HEIGHT - 40){
        this.y = HEIGHT - 40 - this.height;
        this.velY = 0;
        this.grounded = true;
      }

      if(this.x < 0) this.x = 0;
      if(this.x + this.width > MAP_WIDTH) this.x = MAP_WIDTH - this.width;
    }
    draw(cameraX){
      if(this.isDead) return;
      ctx.fillStyle = this.sprites[this.state];
      ctx.save();
      if(!this.facingRight){
        ctx.translate(this.x + this.width/2 - cameraX, 0);
        ctx.scale(-1,1);
        ctx.translate(-this.x - this.width/2 + cameraX, 0);
      }
      ctx.fillRect(this.x - cameraX, this.y, this.width, this.height);
      ctx.restore();
      ctx.fillStyle = 'red';
      ctx.fillRect(this.x - cameraX, this.y - 10, this.width, 5);
      ctx.fillStyle = 'limegreen';
      ctx.fillRect(this.x - cameraX, this.y - 10, this.width * (this.hp/3), 5);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(this.x - cameraX, this.y - 10, this.width, 5);
    }
    getHitBox() {
      return {x: this.x, y: this.y, width:this.width, height:this.height};
    }
  }

  class Platform {
    constructor(x,y,w,h){
      this.x = x;
      this.y = y;
      this.width = w;
      this.height = h;
    }
    draw(cameraX) {
      ctx.fillStyle = '#654321';
      ctx.fillRect(this.x - cameraX, this.y, this.width, this.height);
    }
  }

  class Bullet {
    constructor(x,y,vx,vy, fromPlayer){
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.radius = 5;
      this.fromPlayer = fromPlayer;
      this.dead = false;
    }
    update(){
      this.x += this.vx;
      this.y += this.vy;

      if(this.x < 0 || this.x > MAP_WIDTH || this.y < 0 || this.y > HEIGHT){
        this.dead = true;
      }
    }
    draw(cameraX){
      ctx.fillStyle = this.fromPlayer ? 'yellow' : 'red';
      ctx.beginPath();
      ctx.arc(this.x - cameraX, this.y, this.radius, 0, Math.PI*2);
      ctx.fill();
    }
    getHitBox() {
      return {x:this.x - this.radius, y:this.y - this.radius, width:this.radius*2, height:this.radius*2};
    }
  }

  function checkCollision(a,b){
    return (a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y);
  }

  function circleRectCollision(circle, rect){
    let distX = Math.abs(circle.x - rect.x - rect.width/2);
    let distY = Math.abs(circle.y - rect.y - rect.height/2);

    if(distX > (rect.width/2 + circle.radius)) { return false; }
    if(distY > (rect.height/2 + circle.radius)) { return false; }

    if(distX <= (rect.width/2)) { return true; }
    if(distY <= (rect.height/2)) { return true; }

    let dx=distX - rect.width/2;
    let dy=distY - rect.height/2;
    return (dx*dx + dy*dy <= (circle.radius*circle.radius));
  }

  function calcularDanoArea(yTiro, inimigo){
    let relativeY = yTiro - inimigo.y;
    if(relativeY < inimigo.height * 0.2) return {part:'cabeça', dano:45};
    else if(relativeY < inimigo.height * 0.5) return {part:'peito', dano:25};
    else if(relativeY < inimigo.height * 0.8) return {part:'perna', dano:15};
    else return {part:'pé', dano:10};
  }
  function calcularDanoAreaPlayer(yTiro, player){
    let relativeY = yTiro - player.y;
    if(relativeY < player.height * 0.2) return {part:'cabeça', dano:45};
    else if(relativeY < player.height * 0.5) return {part:'peito', dano:25};
    else if(relativeY < player.height * 0.8) return {part:'perna', dano:15};
    else return {part:'pé', dano:10};
  }

  const player = new Player();

  const platforms = [
    new Platform(0, HEIGHT - 40, MAP_WIDTH, 40),
    new Platform(200, HEIGHT - 100, 150, 15),
    new Platform(450, HEIGHT - 130, 120, 15),
    new Platform(700, HEIGHT - 90, 150, 15),
    new Platform(1200, HEIGHT - 100, 200, 15),
    new Platform(1600, HEIGHT - 140, 150, 15),
    new Platform(2100, HEIGHT - 100, 180, 15),
    new Platform(2600, HEIGHT - 90, 150, 15),
    new Platform(3200, HEIGHT - 120, 250, 15),
    new Platform(3700, HEIGHT - 150, 200, 15),
    new Platform(4200, HEIGHT - 90, 300, 15),
    new Platform(4800, HEIGHT - 110, 150, 15),
    new Platform(5300, HEIGHT - 100, 200, 15),
    new Platform(5800, HEIGHT - 130, 180, 15),
  ];

  const enemies = [
    new Enemy(210, HEIGHT - 100 - 50),
    new Enemy(460, HEIGHT - 130 - 50),
    new Enemy(710, HEIGHT - 90 - 50),
    new Enemy(1250, HEIGHT - 100 - 50),
    new Enemy(1650, HEIGHT - 140 - 50),
    new Enemy(2150, HEIGHT - 100 - 50),
    new Enemy(2650, HEIGHT - 90 - 50),
    new Enemy(3250, HEIGHT - 120 - 50),
    new Enemy(3750, HEIGHT - 150 - 50),
    new Enemy(4300, HEIGHT - 90 - 50),
    new Enemy(4850, HEIGHT - 110 - 50),
    new Enemy(5350, HEIGHT - 100 - 50),
    new Enemy(5850, HEIGHT - 130 - 50),
  ];

  const bullets = [];

  let gameOver = false;

  window.addEventListener('keydown', e => {
    if(e.key.toLowerCase() === 'w') keys.w = true;
    if(e.key.toLowerCase() === 'a') keys.a = true;
    if(e.key.toLowerCase() === 's') keys.s = true;
    if(e.key.toLowerCase() === 'd') keys.d = true;
    if(e.code === 'Space') keys.space = true;
  });
  window.addEventListener('keyup', e => {
    if(e.key.toLowerCase() === 'w') keys.w = false;
    if(e.key.toLowerCase() === 'a') keys.a = false;
    if(e.key.toLowerCase() === 's') keys.s = false;
    if(e.key.toLowerCase() === 'd') keys.d = false;
    if(e.code === 'Space') keys.space = false;
  });

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', e => {
    mouse.down = true;
  });
  canvas.addEventListener('mouseup', e => {
    mouse.down = false;
  });

  let shootCooldown = 0;
  function playerShoot(){
    if(shootCooldown <= 0){
      const centerX = player.x + player.width/2;
      const centerY = player.y + player.height/2;
      let angle = Math.atan2(mouse.y - centerY, mouse.x - (centerX - cameraX));
      let speed = 15;
      let vx = Math.cos(angle)*speed;
      let vy = Math.sin(angle)*speed;
      bullets.push(new Bullet(centerX + vx, centerY + vy, vx, vy, true));
      shootCooldown = 8;
      player.state = 'shoot';
    }
  }

  const gameOverScreen = document.getElementById('gameOverScreen');
  const restartBtn = document.getElementById('restartBtn');
  restartBtn.addEventListener('click', () => {
    location.reload();
  });

  function loop(){
    ctx.clearRect(0,0,WIDTH,HEIGHT);

    if(gameOver){
      gameOverScreen.style.display = 'flex';
      return;
    }

    player.update(platforms);

    for(let e of enemies){
      e.update(player, platforms);
    }

    for(let b of bullets){
      b.update();

      if(b.dead) continue;

      if(b.fromPlayer){
        for(let e of enemies){
          if(e.isDead) continue;
          if(circleRectCollision(b, e.getHitBox())){
            b.dead = true;
            let danoInfo = calcularDanoArea(b.y, e);
            if(danoInfo.part === 'cabeça'){
              e.hp = 0;
            } else {
              e.hp -= 1;
            }
            if(e.hp <= 0){
              e.isDead = true;
            }
            break;
          }
        }
      } else {
        if(circleRectCollision(b, player.getHitBox())){
          b.dead = true;
          let danoInfo = calcularDanoAreaPlayer(b.y, player);
          player.hp -= danoInfo.dano;
          if(player.hp <= 0){
            player.isDead = true;
            gameOver = true;
          }
        }
      }
    }

    for(let i = bullets.length - 1; i >= 0; i--){
      if(bullets[i].dead) bullets.splice(i, 1);
    }

    cameraX = player.x + player.width/2 - WIDTH/2;
    if(cameraX < 0) cameraX = 0;
    if(cameraX > MAP_WIDTH - WIDTH) cameraX = MAP_WIDTH - WIDTH;

    for(let plat of platforms){
      plat.draw(cameraX);
    }

    for(let e of enemies){
      e.draw(cameraX);
    }

    for(let b of bullets){
      b.draw(cameraX);
    }

    player.draw(cameraX);

    if(mouse.down){
      playerShoot();
    }

    if(shootCooldown > 0) shootCooldown--;

    requestAnimationFrame(loop);
  }

  loop();

})();
