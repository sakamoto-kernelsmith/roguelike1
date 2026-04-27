// =============================================================================
// Visual Effects System
// =============================================================================

const Effects = {
  damageNumbers: [],
  particles: [],
  shakeAmount: 0,
  shakeDuration: 0,
  flashColor: null,
  flashDuration: 0,
  floorTransition: null,
  projectile: null,
  animating: false,

  init() {
    this.damageNumbers = [];
    this.particles = [];
    this.shakeAmount = 0;
    this.shakeDuration = 0;
    this.flashColor = null;
    this.flashDuration = 0;
    this.floorTransition = null;
    this.projectile = null;
    this.startLoop();
  },

  startLoop() {
    let lastTime = performance.now();
    const loop = (time) => {
      const dt = time - lastTime;
      lastTime = time;
      this.update(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  hasActive() {
    return this.damageNumbers.length > 0 ||
           this.particles.length > 0 ||
           this.shakeDuration > 0 ||
           this.flashDuration > 0 ||
           this.floorTransition !== null ||
           this.projectile !== null;
  },

  update(dt) {
    // Damage numbers
    for (const dn of this.damageNumbers) {
      dn.age += dt;
      dn.y -= dt * 0.03;
      dn.alpha = Math.max(0, 1 - dn.age / dn.lifetime);
    }
    this.damageNumbers = this.damageNumbers.filter(d => d.age < d.lifetime);

    // Particles
    for (const p of this.particles) {
      p.age += dt;
      p.x += p.vx * dt * 0.001;
      p.y += p.vy * dt * 0.001;
      p.alpha = Math.max(0, 1 - p.age / p.lifetime);
    }
    this.particles = this.particles.filter(p => p.age < p.lifetime);

    // Shake
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) {
        this.shakeDuration = 0;
        this.shakeAmount = 0;
        if (Renderer.canvas) Renderer.canvas.style.transform = '';
      } else {
        const intensity = this.shakeAmount * (this.shakeDuration / 300);
        const sx = (Math.random() - 0.5) * intensity * 6;
        const sy = (Math.random() - 0.5) * intensity * 6;
        if (Renderer.canvas) Renderer.canvas.style.transform = `translate(${sx}px, ${sy}px)`;
      }
    }

    // Flash
    if (this.flashDuration > 0) {
      this.flashDuration -= dt;
    }

    // Floor transition
    if (this.floorTransition) {
      this.floorTransition.elapsed += dt;
      const t = this.floorTransition;
      if (t.phase === 'fadeout' && t.elapsed >= 500) {
        t.phase = 'text';
        t.elapsed = 0;
        if (t.callback) { t.callback(); t.callback = null; }
      } else if (t.phase === 'text' && t.elapsed >= 800) {
        t.phase = 'fadein';
        t.elapsed = 0;
      } else if (t.phase === 'fadein' && t.elapsed >= 500) {
        this.floorTransition = null;
      }
    }

    // Projectile
    if (this.projectile) {
      this.projectile.age += dt;
      if (this.projectile.age >= this.projectile.lifetime) {
        this.projectile = null;
      }
    }

    // Danmaku idle tick
    if (typeof DanmakuManager !== 'undefined') {
      DanmakuManager.tickIdle(dt);
    }

    // Re-render if effects active
    if (this.hasActive() && typeof Game !== 'undefined' && Game.state && Renderer.ctx) {
      if (!this.floorTransition || this.floorTransition.phase !== 'fadeout') {
        Renderer.render(Game.state);
      }
      this.renderOverlays(Renderer.ctx, Renderer.canvas);
    }
  },

  spawnDamageNumber(tileX, tileY, value, isHeal, isCrit) {
    this.damageNumbers.push({
      x: tileX,
      y: tileY,
      value: (isHeal ? '+' : '') + value,
      color: isHeal ? '#40ff40' : (isCrit ? '#ffcc00' : '#ff4444'),
      fontSize: isCrit ? 18 : 14,
      age: 0,
      lifetime: 1000,
      alpha: 1,
    });
  },

  spawnParticles(tileX, tileY, color, count) {
    // Disabled: particle scatter effect removed for calmer visuals
  },

  spawnProjectile(path, color) {
    if (path.length === 0) return;
    this.projectile = { path, color, age: 0, lifetime: Math.max(200, path.length * 60) };
  },

  screenShake(amount) {
    this.shakeAmount = amount;
    this.shakeDuration = 300;
  },

  flashScreen(color) {
    this.flashColor = color;
    this.flashDuration = 200;
  },

  startFloorTransition(floorNum, callback) {
    this.floorTransition = {
      floor: floorNum,
      phase: 'fadeout',
      elapsed: 0,
      callback,
    };
  },

  renderOverlays(ctx, canvas) {
    if (!ctx || !canvas) return;
    const { offsetX, offsetY } = Renderer.getViewOffset(Game.state.player);
    const ts = Renderer.tileSize;

    // Damage numbers
    for (const dn of this.damageNumbers) {
      const sx = (dn.x - offsetX) * ts + ts / 2;
      const sy = (dn.y - offsetY) * ts;
      ctx.save();
      ctx.globalAlpha = dn.alpha;
      ctx.font = `bold ${dn.fontSize}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000';
      ctx.fillText(dn.value, sx + 1, sy + 1);
      ctx.fillStyle = dn.color;
      ctx.fillText(dn.value, sx, sy);
      ctx.restore();
    }

    // Particles
    for (const p of this.particles) {
      const sx = (p.x - offsetX) * ts + ts / 2;
      const sy = (p.y - offsetY) * ts + ts / 2;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Projectile
    if (this.projectile) {
      const proj = this.projectile;
      const progress = proj.age / proj.lifetime;
      const currentIdx = Math.floor(progress * proj.path.length);
      for (let i = 0; i < proj.path.length; i++) {
        const fade = 1 - (currentIdx - i) / 4;
        if (fade <= 0) continue;
        const tile = proj.path[i];
        const sx = (tile.x - offsetX) * ts + ts / 2;
        const sy = (tile.y - offsetY) * ts + ts / 2;
        ctx.save();
        ctx.globalAlpha = Math.min(1, fade);
        ctx.fillStyle = proj.color;
        ctx.font = `bold ${ts}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('*', sx, sy);
        ctx.restore();
      }
    }

    // Screen flash
    if (this.flashDuration > 0 && this.flashColor) {
      ctx.save();
      ctx.globalAlpha = this.flashDuration / 200;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // Floor transition overlay
    if (this.floorTransition) {
      const t = this.floorTransition;
      ctx.save();
      let alpha = 0;
      if (t.phase === 'fadeout') {
        alpha = Math.min(1, t.elapsed / 500);
      } else if (t.phase === 'text') {
        alpha = 1;
      } else if (t.phase === 'fadein') {
        alpha = Math.max(0, 1 - t.elapsed / 500);
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (t.phase === 'text' || (t.phase === 'fadein' && t.elapsed < 200)) {
        ctx.globalAlpha = t.phase === 'text' ? Math.min(1, t.elapsed / 200) : (1 - t.elapsed / 200);
        ctx.fillStyle = '#e0a040';
        ctx.font = 'bold 32px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Show floor name from lore if available
        const lore = typeof FLOOR_LORE !== 'undefined' ? FLOOR_LORE[t.floor] : null;
        const floorTitle = lore ? `Floor ${t.floor}: ${lore.name}` : `Floor ${t.floor}`;
        ctx.fillText(floorTitle, canvas.width / 2, canvas.height / 2);
      }
      ctx.restore();
    }
  },
};
