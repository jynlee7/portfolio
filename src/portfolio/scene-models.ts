import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type SceneKind = 'tennis' | 'knowledge' | 'compute' | 'stadium' | 'protein' | 'spectra' | 'transit' | 'simulation' | 'chess' | 'field';

const INK = '#2a287a';
const IVORY = '#faf8ee';

/** Deliberately illustrative objects: these are sculptures, never purported product data. */
export function buildScene(kind: SceneKind) {
  const scene = new T.Scene();
  const object = new T.Group();
  const sculpture = new T.Group();
  const materials = new Map<string, T.MeshStandardMaterial>();
  const mat = (color: string) => {
    if (!materials.has(color)) materials.set(color, new T.MeshStandardMaterial({ color, roughness: .34, metalness: .06 }));
    return materials.get(color)!;
  };
  const mesh = (geometry: T.BufferGeometry, color: string, x = 0, y = 0, z = 0, parent: T.Object3D = sculpture) => {
    const item = new T.Mesh(geometry, mat(color));
    item.position.set(x, y, z);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  };
  const box = (w: number, h: number, d: number, color: string, x = 0, y = 0, z = 0, radius = .06, parent?: T.Object3D) =>
    mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3)), color, x, y, z, parent);
  const ball = (r: number, color: string, x: number, y: number, z: number, parent?: T.Object3D) =>
    mesh(new T.SphereGeometry(r, 32, 20), color, x, y, z, parent);
  const pipe = (points: number[][], color: string, radius = .025, parent?: T.Object3D, smooth = true) => {
    const vectors = points.map(p => new T.Vector3(p[0], p[1], p[2]));
    const curve = new T.CatmullRomCurve3(vectors, false, 'centripetal', .5);
    if (smooth) return mesh(new T.TubeGeometry(curve, Math.max(12, points.length * 6), radius, 8, false), color, 0, 0, 0, parent);
    for (let i = 1; i < vectors.length; i++) {
      const start = vectors[i - 1], end = vectors[i];
      const cylinder = mesh(new T.CylinderGeometry(radius, radius, start.distanceTo(end), 8), color, 0, 0, 0, parent);
      cylinder.position.copy(start).add(end).multiplyScalar(.5);
      cylinder.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), end.clone().sub(start).normalize());
    }
    return undefined;
  };
  const ring = (r: number, thickness: number, color: string, x = 0, y = 0, z = 0, parent?: T.Object3D) =>
    mesh(new T.TorusGeometry(r, thickness, 12, 64), color, x, y, z, parent);

  if (kind === 'tennis') {
    box(4.1, .19, 2.6, INK, 0, -.1, 0, .12);
    box(3.87, .045, 2.37, '#766ddb', 0, .025, 0, .025);
    const y = .055;
    pipe([[-1.63,y,-.94],[1.63,y,-.94],[1.63,y,.94],[-1.63,y,.94],[-1.63,y,-.94]], IVORY, .018, undefined, false);
    pipe([[-1.63,y,-.66],[1.63,y,-.66]], IVORY, .014, undefined, false);
    pipe([[-1.63,y,.66],[1.63,y,.66]], IVORY, .014, undefined, false);
    for (const x of [-.85,.85]) pipe([[x,y,-.66],[x,y,.66]], IVORY, .013, undefined, false);
    pipe([[-.85,y,0],[.85,y,0]], IVORY, .013, undefined, false);
    for (const z of [-1.1,1.1]) box(.055,.6,.055,INK,0,.33,z,.012);
    for (let z = -1.05; z <= 1.08; z += .13) pipe([[0,.09,z],[0,.52,z]], '#d4d1ed', .006, undefined, false);
    for (let h = .09; h <= .53; h += .086) pipe([[0,h,-1.1],[0,h,1.1]], '#d4d1ed', .006, undefined, false);
    pipe([[0,.55,-1.12],[0,.55,1.12]], IVORY, .022, undefined, false);
    const tennis = new T.Group();
    tennis.position.set(-.72,1.2,.25);
    tennis.rotation.set(.32, .25, -.5);
    sculpture.add(tennis);
    ball(.44, '#d8ef64', 0, 0, 0, tennis);
    for (const sign of [-1,1]) {
      const points = Array.from({length:45}, (_,i) => {
        const t = i / 44 * Math.PI * 2;
        const x = sign * (.17 + .095 * Math.cos(t * 2));
        const r = Math.sqrt(.445 ** 2 - x ** 2);
        return [x, Math.sin(t) * r, Math.cos(t) * r];
      });
      pipe(points, '#fffbd0', .013, tennis);
    }
    pipe([[-1.65,.16,.5],[-1.5,.78,.46],[-1.18,1.12,.37]], '#d9ed86', .025);
    ring(.22,.016,'#d9ed86',-1.68,.075,.52)!.rotation.x = -Math.PI / 2;
  } else if (kind === 'knowledge') {
    const palettes = ['#ddd8ff','#a69aef','#7c67d7'];
    for (let i = 0; i < 3; i++) {
      const document = new T.Group();
      document.position.set((i - 1) * .68, .55 + i * .33, (i - 1) * -.33);
      document.rotation.set(-.08, -.22 + i * .08, .12 - i * .07);
      sculpture.add(document);
      box(1.65,2.05,.11,palettes[i],0,0,0,.1,document);
      box(.38,.27,.045,IVORY,-.43,.58,.08,.04,document);
      for (let row = 0; row < 4; row++) box(row === 3 ? .62 : 1.02,.05,.045,'#f5f0ff',row === 3 ? -.2 : 0,.17 - row * .22,.08,.02,document);
      box(.26,.08,.055,INK,.46,-.73,.08,.02,document);
    }
    const nodes = [[-1.62,.14,.42],[-1.54,1.42,-.53],[1.54,2.07,-.33],[1.66,.48,.4]];
    pipe([nodes[0],[-2,.72,0],nodes[1],[-.3,2.75,-.8],nodes[2],[2.16,1.2,0],nodes[3]],INK,.035);
    nodes.forEach((p,i) => ball(i === 2 ? .19 : .13, i === 2 ? '#f6b45c' : '#51419c',p[0],p[1],p[2]));
    box(3.9,.13,2.1,'#e4dff6',0,-.7,0,.1);
  } else if (kind === 'compute') {
    box(3.65,.13,2.65,'#343b55',0,-.16,0,.1);
    for (const z of [-.95,-.63,.64,.96]) {
      pipe([[-1.58,-.075,z],[-.94,-.075,z],[-.75,-.075,z * .5]],'#86dad2',.018,undefined,false);
      pipe([[.76,-.075,z * .5],[1.05,-.075,z],[1.58,-.075,z]],'#86dad2',.018,undefined,false);
      ball(.037,'#c1f4e2',-1.58,-.052,z);
      ball(.037,'#c1f4e2',1.58,-.052,z);
    }
    for (let i = 0; i < 3; i++) {
      box(1.83,.32,1.65,['#485777','#648499','#9fc5c5'][i],0,.14 + i * .54,0,.075);
      for (let j = 0; j < 6; j++) {
        box(.07,.04,.17,'#c9d7e1',-.65 + j * .26,.14 + i * .54,.9,.01);
        box(.07,.04,.17,'#c9d7e1',-.65 + j * .26,.14 + i * .54,-.9,.01);
      }
      ball(.04,'#d4f89d',.65,.16 + i * .54,.839);
    }
    box(1.09,.13,.97,'#d6eee6',0,1.49,0,.04);
    const core = mesh(new T.IcosahedronGeometry(.46,0),'#b9ea8b',0,2.12,0);
    core.rotation.set(.1, .2, .1);
    for (const x of [-.72,.72]) pipe([[x,.35,-.59],[x,1.21,-.59]],'#c3e9df',.018,undefined,false);
  } else if (kind === 'stadium') {
    box(3.8,.2,2.9,'#d6dbea',0,-.16,0,.16);
    box(2.69,.045,1.72,'#7b9f98',0,-.025,0,.03);
    for (const z of [-1.15,1.15]) {
      for (let row = 0; row < 3; row++) box(3.19 + row * .13,.14,.22,row === 1 ? '#dcad53' : '#344a89',0,.13 + row * .17,z + Math.sign(z) * row * .12,.025);
    }
    for (const x of [-1.52,1.52]) for (let row = 0; row < 3; row++) box(.22,.14,2.12,row === 1 ? '#dcad53' : '#344a89',x + Math.sign(x) * row * .12,.13 + row * .17,0,.025);
    for (let x = -1.03; x <= 1.05; x += .26) box(.012,.018,1.29,'#e9f0df',x,.011,0,.003);
    for (const z of [-.69,.69]) box(2.15,.018,.02,'#e9f0df',0,.01,z,.003);
    for (const x of [-1.18,1.18]) {
      pipe([[x,.05,0],[x,.67,0],[x,.67,-.3],[x,1.02,-.3]],'#f0d275',.025,undefined,false);
      pipe([[x,.67,0],[x,.67,.3],[x,1.02,.3]],'#f0d275',.025,undefined,false);
    }
    for (const x of [-1.7,1.7]) {
      box(.055,1.33,.055,INK,x,.83,-1.13,.018);
      box(.49,.17,.11,'#fff3c7',x,1.53,-1.13,.02);
      for (let i=0;i<3;i++) box(.07,.085,.12,IVORY,x-.14+i*.14,1.53,-1.08,.02);
    }
  } else if (kind === 'protein' || kind === 'spectra') {
    const points: number[][] = [];
    for (let i = 0; i < 81; i++) {
      const t = i / 80 * Math.PI * 5.4;
      points.push([Math.cos(t) * .62 + Math.sin(t*.48)*.38, (i / 80 - .5) * 2.7, Math.sin(t) * .64]);
    }
    pipe(points, '#c47046', .11);
    const twin = points.map(([x,y,z]) => [-x,y,-z]);
    pipe(twin, '#6260bb', .09);
    for (let i = 4; i < points.length - 4; i += 5) {
      pipe([points[i],twin[i]],'#e4b98d',.03,undefined,false);
      ball(.12,'#f4d7b5',points[i][0],points[i][1],points[i][2]);
    }
    const satellite = [[1.28,.78,.16],[1.68,1.04,-.2],[1.73,.51,.51],[-1.43,-.81,.32],[-1.77,-.3,.56]];
    satellite.forEach((p,i) => {
      ball(i % 2 ? .17 : .24,i % 2 ? '#8b7bc1' : '#da925e',p[0],p[1],p[2]);
      if (i > 0 && i !== 3) pipe([satellite[i-1],p],'#c5abbb',.043,undefined,false);
    });
    const stand = mesh(new T.CylinderGeometry(1.28,1.39,.12,64),'#e7d5d3',0,-1.69,0);
    stand.rotation.y = .1;
  } else if (kind === 'transit') {
    box(3.85,.18,2.9,'#bad3b7',0,-.15,0,.12);
    box(3.6,.02,.2,'#f6faee',0,-.045,.42,.015);
    box(.2,.02,2.61,'#f6faee',.61,-.04,0,.015);
    box(3.6,.02,.12,'#e5eedb',0,-.04,-.71,.01);
    box(.13,.02,2.61,'#e5eedb',-.9,-.04,0,.01);
    const buildings = [[-1.27,-.94,.6],[-.39,-.29,1.03],[1.16,-.72,.69],[1.27,.98,.45],[-1.25,.93,.5]];
    buildings.forEach(([x,z,h],i) => {
      box(.47,h,.48,i === 1 ? '#43634e' : '#e9e7d3',x,h / 2,z,.025);
      box(.52,.075,.53,i === 1 ? '#28493c' : '#bbc3a4',x,h+.018,z,.025);
      if (i === 1) {
        const roof = mesh(new T.ConeGeometry(.34,.24,4),'#536a57',x,h+.17,z);
        roof.rotation.y = Math.PI / 4;
        box(.17,.58,.18,'#e5dfc6',x,h+.54,z,.018);
        mesh(new T.ConeGeometry(.18,.25,4),'#627257',x,h+.94,z).rotation.y = Math.PI/4;
      }
    });
    pipe([[-1.57,.055,.42],[-.9,.055,.42],[.61,.055,.42],[.61,.055,-.71],[1.42,.055,-.71]],'#3e7250',.04,undefined,false);
    for (const [x,z] of [[-1.56,.43],[.61,.42],[1.42,-.71]]) {
      mesh(new T.CylinderGeometry(.085,.085,.05,24),'#d3ef90',x,.07,z);
    }
    const pin = new T.Group();
    pin.position.set(.61,.65,.42);
    sculpture.add(pin);
    ring(.24,.093,'#567e3f',0,.23,0,pin);
    mesh(new T.ConeGeometry(.19,.4,3),'#567e3f',0,-.06,0,pin).rotation.z = Math.PI;
    for (const [x,z] of [[-1.63,-.11],[1.62,.08],[-.31,1.04]]) {
      mesh(new T.CylinderGeometry(.026,.035,.28,8),'#8c9270',x,.14,z);
      ball(.18,'#6a935a',x,.39,z);
    }
  } else if (kind === 'simulation') {
    const panel = new T.Group();
    panel.rotation.y = -.14;
    sculpture.add(panel);
    box(3.05,2.07,.22,'#a99ad2',0,.66,0,.12,panel);
    box(2.76,1.76,.055,'#f7f3f5',0,.66,.139,.085,panel);
    // An abstract branching decision path, deliberately without invented clinical readings.
    pipe([[-.92,.7,.19],[-.38,.7,.19],[.01,1.14,.19],[.88,1.14,.19]],'#cc7b78',.031,panel,false);
    pipe([[-.38,.7,.19],[.04,.27,.19],[.88,.27,.19]],'#8a7bb5',.031,panel,false);
    for (const [x,y,c] of [[-.94,.7,'#d69a93'],[.89,1.14,'#dfada6'],[.89,.27,'#b0a4cd']] as const) ball(.1,c,x,y,.2,panel);
    box(.36,.6,.32,'#8b7cb4',0,-.61,0,.05,panel);
    box(1.35,.1,.77,'#b9aad7',0,-.94,.1,.055,panel);
    const cross = new T.Group();
    cross.position.set(-1.31,-.12,.77);
    cross.rotation.z = -.08;
    sculpture.add(cross);
    box(.33,1.01,.24,'#edafa6',0,0,0,.07,cross);
    box(.99,.33,.24,'#edafa6',0,0,0,.07,cross);
    ring(.34,.075,'#d6ccec',1.49,-.53,.52)!.rotation.set(.24,.35,.1);
  } else if (kind === 'chess') {
    box(3.4,.17,3.4,'#8d9abf',0,-.1,0,.1);
    for (let x=0;x<6;x++) for (let z=0;z<6;z++) box(.53,.045,.53,(x+z)%2 ? '#6b7eaa' : IVORY,(x-2.5)*.53,.008,(z-2.5)*.53,.012);
    const piece = (x: number,z: number,color: string,king: boolean) => {
      const profile = [[0,0],[.3,0],[.31,.1],[.24,.18],[.13,.27],[.11,.57],[.2,.62],[.22,.7],[.16,.77],[0,.79]];
      mesh(new T.LatheGeometry(profile.map(p=>new T.Vector2(p[0],p[1])),32),color,x,.04,z);
      if (king) {
        box(.12,.44,.12,color,x,1.02,z,.025);
        box(.34,.11,.12,color,x,1.1,z,.025);
      } else ball(.18,color,x,.94,z);
    };
    piece(-.8,-.27,INK,true);
    piece(.8,.27,IVORY,true);
    piece(.26,-.8,INK,false);
    piece(-.27,.8,IVORY,false);
  } else {
    const plate = mesh(new T.CylinderGeometry(1.93,1.99,.1,80),'#c0bee5',0,-.62,0);
    plate.rotation.y = .1;
    for (let layer = 0; layer < 11; layer++) {
      const radius = .28 + layer * .145;
      const points = Array.from({length:97},(_,i) => {
        const t=i/96*Math.PI*2;
        const wobble=1+Math.sin(t*3+layer*.23)*.11;
        return [Math.cos(t)*radius*wobble,-.43+(11-layer)*.112+Math.sin(t*2+layer*.2)*.11,Math.sin(t)*radius*wobble];
      });
      pipe(points,layer % 3 === 0 ? '#5147a9' : '#8276c4',.025);
    }
    ball(.34,'#edbc77',.01,1.31,.03);
    ring(.42,.027,IVORY,.01,1.31,.03)!.rotation.x = .9;
  }

  const bounds = new T.Box3().setFromObject(sculpture);
  const center = bounds.getCenter(new T.Vector3());
  const radius = bounds.getSize(new T.Vector3()).length() / 2;
  sculpture.position.sub(center);
  object.add(sculpture);
  scene.add(object);

  const floor = new T.Mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({ color: '#28224d', opacity: .17 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = bounds.min.y - center.y - .035;
  floor.receiveShadow = true;
  scene.add(floor);
  scene.add(new T.HemisphereLight('#ffffff','#b2b1cf',2.6));
  const key = new T.DirectionalLight('#fff6e7',4.2);
  key.position.set(-3.5,7,5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024,1024);
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  key.shadow.camera.near = .5;
  key.shadow.camera.far = 20;
  key.shadow.normalBias = .025;
  key.shadow.bias = -.0002;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new T.DirectionalLight('#d9deff',1.3);
  fill.position.set(4,2,-4);
  scene.add(fill);
  return { scene, object, radius };
}
