import{I as Ui,F as sn,a as ro,b as kt,W as $i,B as xo,S as ii,V as ne,c as $e,d as En,U as ai,e as It,f as zn,M as ee,g as In,L as Bi,h as wo,i as Ve,j as bo,k as ri,l as Fe,m as Wi,P as Fi,n as Rt,o as si,p as ln,A as Hi,q as Ni,r as li,s as ci,H as ui,D as Tn,G as ct,C as ce,N as Gi,t as ot,u as fi,E as di,R as pi,v as ji,O as Jn,Z as qi,w as Vi,x as Zi,y as cn,z as so,J as Xi,K as Ut,Q as lo,T as Qi,X as Yi,Y as Do,_ as Ao,$ as mi,a0 as hi,a1 as vn}from"./three-5qFCt21G.js";const Lo=new xo,gn=new ne;class vi extends Ui{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],a=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],i=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(i),this.setAttribute("position",new sn(e,3)),this.setAttribute("uv",new sn(a,2))}applyMatrix4(e){const a=this.attributes.instanceStart,i=this.attributes.instanceEnd;return a!==void 0&&(a.applyMatrix4(e),i.applyMatrix4(e),a.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let a;e instanceof Float32Array?a=e:Array.isArray(e)&&(a=new Float32Array(e));const i=new ro(a,6,1);return this.setAttribute("instanceStart",new kt(i,3,0)),this.setAttribute("instanceEnd",new kt(i,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let a;e instanceof Float32Array?a=e:Array.isArray(e)&&(a=new Float32Array(e));const i=new ro(a,6,1);return this.setAttribute("instanceColorStart",new kt(i,3,0)),this.setAttribute("instanceColorEnd",new kt(i,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new $i(e.geometry)),this}fromLineSegments(e){const a=e.geometry;return this.setPositions(a.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new xo);const e=this.attributes.instanceStart,a=this.attributes.instanceEnd;e!==void 0&&a!==void 0&&(this.boundingBox.setFromBufferAttribute(e),Lo.setFromBufferAttribute(a),this.boundingBox.union(Lo))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new ii),this.boundingBox===null&&this.computeBoundingBox();const e=this.attributes.instanceStart,a=this.attributes.instanceEnd;if(e!==void 0&&a!==void 0){const i=this.boundingSphere.center;this.boundingBox.getCenter(i);let s=0;for(let d=0,g=e.count;d<g;d++)gn.fromBufferAttribute(e,d),s=Math.max(s,i.distanceToSquared(gn)),gn.fromBufferAttribute(a,d),s=Math.max(s,i.distanceToSquared(gn));this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}zn.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new It(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}};En.line={uniforms:ai.merge([zn.common,zn.fog,zn.line]),vertexShader:`
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		void trimSegment( const in vec4 start, inout vec4 end ) {

			// trim end segment so it terminates between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
			float nearEstimate = - 0.5 * b / a;

			float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

			end.xyz = mix( start.xyz, end.xyz, alpha );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
				vUv = uv;

			#endif

			float aspect = resolution.x / resolution.y;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					trimSegment( start, end );

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					trimSegment( end, start );

				}

			}

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = normalize( mix( start.xyz, end.xyz, 0.5 ) );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = linewidth * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
				clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= linewidth;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,fragmentShader:`
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		#ifdef USE_DASH

			uniform float dashOffset;
			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

			float mua;
			float mub;

			vec3 p13 = p1 - p3;
			vec3 p43 = p4 - p3;

			vec3 p21 = p2 - p1;

			float d1343 = dot( p13, p43 );
			float d4321 = dot( p43, p21 );
			float d1321 = dot( p13, p21 );
			float d4343 = dot( p43, p43 );
			float d2121 = dot( p21, p21 );

			float denom = d2121 * d4343 - d4321 * d4321;

			float numer = d1343 * d4321 - d1321 * d4343;

			mua = numer / denom;
			mua = clamp( mua, 0.0, 1.0 );
			mub = ( d1343 + d4321 * ( mua ) ) / d4343;
			mub = clamp( mub, 0.0, 1.0 );

			return vec2( mua, mub );

		}

		void main() {

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			float alpha = opacity;

			#ifdef WORLD_UNITS

				// Find the closest points on the view ray and the line segment
				vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
				vec3 lineDir = worldEnd - worldStart;
				vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

				vec3 p1 = worldStart + lineDir * params.x;
				vec3 p2 = rayEnd * params.y;
				vec3 delta = p1 - p2;
				float len = length( delta );
				float norm = len / linewidth;

				#ifndef USE_DASH

					#ifdef USE_ALPHA_TO_COVERAGE

						float dnorm = fwidth( norm );
						alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

					#else

						if ( norm > 0.5 ) {

							discard;

						}

					#endif

				#endif

			#else

				#ifdef USE_ALPHA_TO_COVERAGE

					// artifacts appear on some hardware if a derivative is taken within a conditional
					float a = vUv.x;
					float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
					float len2 = a * a + b * b;
					float dlen = fwidth( len2 );

					if ( abs( vUv.y ) > 1.0 ) {

						alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

					}

				#else

					if ( abs( vUv.y ) > 1.0 ) {

						float a = vUv.x;
						float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
						float len2 = a * a + b * b;

						if ( len2 > 1.0 ) discard;

					}

				#endif

			#endif

			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`};class Un extends $e{constructor(e){super({type:"LineMaterial",uniforms:ai.clone(En.line.uniforms),vertexShader:En.line.vertexShader,fragmentShader:En.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(e){e===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return"USE_DASH"in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1))}}const Po=new ne,_o=new ne,Me=new In,Ee=new In,Ge=new In,eo=new ne,to=new wo,ze=new Bi,ko=new ne,yn=new xo,xn=new ii,je=new In;let Ze,bt;function Ro(t,e,a){return je.set(0,0,-e,1).applyMatrix4(t.projectionMatrix),je.multiplyScalar(1/je.w),je.x=bt/a.width,je.y=bt/a.height,je.applyMatrix4(t.projectionMatrixInverse),je.multiplyScalar(1/je.w),Math.abs(Math.max(je.x,je.y))}function Ki(t,e){const a=t.matrixWorld,i=t.geometry,s=i.attributes.instanceStart,d=i.attributes.instanceEnd,g=Math.min(i.instanceCount,s.count);for(let u=0,b=g;u<b;u++){ze.start.fromBufferAttribute(s,u),ze.end.fromBufferAttribute(d,u),ze.applyMatrix4(a);const y=new ne,c=new ne;Ze.distanceSqToSegment(ze.start,ze.end,c,y),c.distanceTo(y)<bt*.5&&e.push({point:c,pointOnLine:y,distance:Ze.origin.distanceTo(c),object:t,face:null,faceIndex:u,uv:null,uv1:null})}}function Ji(t,e,a){const i=e.projectionMatrix,d=t.material.resolution,g=t.matrixWorld,u=t.geometry,b=u.attributes.instanceStart,y=u.attributes.instanceEnd,c=Math.min(u.instanceCount,b.count),f=-e.near;Ze.at(1,Ge),Ge.w=1,Ge.applyMatrix4(e.matrixWorldInverse),Ge.applyMatrix4(i),Ge.multiplyScalar(1/Ge.w),Ge.x*=d.x/2,Ge.y*=d.y/2,Ge.z=0,eo.copy(Ge),to.multiplyMatrices(e.matrixWorldInverse,g);for(let m=0,T=c;m<T;m++){if(Me.fromBufferAttribute(b,m),Ee.fromBufferAttribute(y,m),Me.w=1,Ee.w=1,Me.applyMatrix4(to),Ee.applyMatrix4(to),Me.z>f&&Ee.z>f)continue;if(Me.z>f){const P=Me.z-Ee.z,_=(Me.z-f)/P;Me.lerp(Ee,_)}else if(Ee.z>f){const P=Ee.z-Me.z,_=(Ee.z-f)/P;Ee.lerp(Me,_)}Me.applyMatrix4(i),Ee.applyMatrix4(i),Me.multiplyScalar(1/Me.w),Ee.multiplyScalar(1/Ee.w),Me.x*=d.x/2,Me.y*=d.y/2,Ee.x*=d.x/2,Ee.y*=d.y/2,ze.start.copy(Me),ze.start.z=0,ze.end.copy(Ee),ze.end.z=0;const k=ze.closestPointToPointParameter(eo,!0);ze.at(k,ko);const E=Ve.lerp(Me.z,Ee.z,k),R=E>=-1&&E<=1,U=eo.distanceTo(ko)<bt*.5;if(R&&U){ze.start.fromBufferAttribute(b,m),ze.end.fromBufferAttribute(y,m),ze.start.applyMatrix4(g),ze.end.applyMatrix4(g);const P=new ne,_=new ne;Ze.distanceSqToSegment(ze.start,ze.end,_,P),a.push({point:_,pointOnLine:P,distance:Ze.origin.distanceTo(_),object:t,face:null,faceIndex:m,uv:null,uv1:null})}}}class ea extends ee{constructor(e=new vi,a=new Un({color:Math.random()*16777215})){super(e,a),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const e=this.geometry,a=e.attributes.instanceStart,i=e.attributes.instanceEnd,s=new Float32Array(2*a.count);for(let g=0,u=0,b=a.count;g<b;g++,u+=2)Po.fromBufferAttribute(a,g),_o.fromBufferAttribute(i,g),s[u]=u===0?0:s[u-1],s[u+1]=s[u]+Po.distanceTo(_o);const d=new ro(s,2,1);return e.setAttribute("instanceDistanceStart",new kt(d,1,0)),e.setAttribute("instanceDistanceEnd",new kt(d,1,1)),this}raycast(e,a){const i=this.material.worldUnits,s=e.camera;s===null&&!i&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const d=e.params.Line2!==void 0&&e.params.Line2.threshold||0;Ze=e.ray;const g=this.matrixWorld,u=this.geometry,b=this.material;bt=b.linewidth+d,u.boundingSphere===null&&u.computeBoundingSphere(),xn.copy(u.boundingSphere).applyMatrix4(g);let y;if(i)y=bt*.5;else{const f=Math.max(s.near,xn.distanceToPoint(Ze.origin));y=Ro(s,f,b.resolution)}if(xn.radius+=y,Ze.intersectsSphere(xn)===!1)return;u.boundingBox===null&&u.computeBoundingBox(),yn.copy(u.boundingBox).applyMatrix4(g);let c;if(i)c=bt*.5;else{const f=Math.max(s.near,yn.distanceToPoint(Ze.origin));c=Ro(s,f,b.resolution)}yn.expandByScalar(c),Ze.intersectsBox(yn)!==!1&&(i?Ki(this,a):Ji(this,s,a))}}class So extends vi{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){const a=e.length-3,i=new Float32Array(2*a);for(let s=0;s<a;s+=3)i[2*s]=e[s],i[2*s+1]=e[s+1],i[2*s+2]=e[s+2],i[2*s+3]=e[s+3],i[2*s+4]=e[s+4],i[2*s+5]=e[s+5];return super.setPositions(i),this}setColors(e){const a=e.length-3,i=new Float32Array(2*a);for(let s=0;s<a;s+=3)i[2*s]=e[s],i[2*s+1]=e[s+1],i[2*s+2]=e[s+2],i[2*s+3]=e[s+3],i[2*s+4]=e[s+4],i[2*s+5]=e[s+5];return super.setColors(i),this}fromLine(e){const a=e.geometry;return this.setPositions(a.attributes.position.array),this}}class gi extends ea{constructor(e=new So,a=new Un({color:Math.random()*16777215})){super(e,a),this.isLine2=!0,this.type="Line2"}}class yi extends bo{constructor(e=null){super();const a=new ri;a.deleteAttribute("uv");const i=new Fe({side:Wi}),s=new Fe;let d=5;e!==null&&e._useLegacyLights===!1&&(d=900);const g=new Fi(16777215,d,28,2);g.position.set(.418,16.199,.3),this.add(g);const u=new ee(a,i);u.position.set(-.757,13.219,.717),u.scale.set(31.713,28.305,28.591),this.add(u);const b=new ee(a,s);b.position.set(-10.906,2.009,1.846),b.rotation.set(0,-.195,0),b.scale.set(2.328,7.905,4.651),this.add(b);const y=new ee(a,s);y.position.set(-5.607,-.754,-.758),y.rotation.set(0,.994,0),y.scale.set(1.97,1.534,3.955),this.add(y);const c=new ee(a,s);c.position.set(6.167,.857,7.803),c.rotation.set(0,.561,0),c.scale.set(3.927,6.285,3.687),this.add(c);const f=new ee(a,s);f.position.set(-2.017,.018,6.124),f.rotation.set(0,.333,0),f.scale.set(2.002,4.566,2.064),this.add(f);const m=new ee(a,s);m.position.set(2.291,-.756,-2.621),m.rotation.set(0,-.286,0),m.scale.set(1.546,1.552,1.496),this.add(m);const T=new ee(a,s);T.position.set(-2.193,-.369,-5.547),T.rotation.set(0,.516,0),T.scale.set(3.875,3.487,2.986),this.add(T);const C=new ee(a,Pt(50));C.position.set(-16.116,14.37,8.208),C.scale.set(.1,2.428,2.739),this.add(C);const k=new ee(a,Pt(50));k.position.set(-16.109,18.021,-8.207),k.scale.set(.1,2.425,2.751),this.add(k);const E=new ee(a,Pt(17));E.position.set(14.904,12.198,-1.832),E.scale.set(.15,4.265,6.331),this.add(E);const R=new ee(a,Pt(43));R.position.set(-.462,8.89,14.52),R.scale.set(4.38,5.441,.088),this.add(R);const U=new ee(a,Pt(20));U.position.set(3.235,11.486,-12.541),U.scale.set(2.5,2,.1),this.add(U);const P=new ee(a,Pt(100));P.position.set(0,20,0),P.scale.set(1,.1,1),this.add(P)}dispose(){const e=new Set;this.traverse(a=>{a.isMesh&&(e.add(a.geometry),e.add(a.material))});for(const a of e)a.dispose()}}function Pt(t){const e=new Rt;return e.color.setScalar(t),e}function Cn(t,e){return t==null||e==null?NaN:t<e?-1:t>e?1:t>=e?0:NaN}function ta(t,e){return t==null||e==null?NaN:e<t?-1:e>t?1:e>=t?0:NaN}function xi(t){let e,a,i;t.length!==2?(e=Cn,a=(u,b)=>Cn(t(u),b),i=(u,b)=>t(u)-b):(e=t===Cn||t===ta?t:na,a=t,i=t);function s(u,b,y=0,c=u.length){if(y<c){if(e(b,b)!==0)return c;do{const f=y+c>>>1;a(u[f],b)<0?y=f+1:c=f}while(y<c)}return y}function d(u,b,y=0,c=u.length){if(y<c){if(e(b,b)!==0)return c;do{const f=y+c>>>1;a(u[f],b)<=0?y=f+1:c=f}while(y<c)}return y}function g(u,b,y=0,c=u.length){const f=s(u,b,y,c-1);return f>y&&i(u[f-1],b)>-i(u[f],b)?f-1:f}return{left:s,center:g,right:d}}function na(){return 0}function oa(t){return t===null?NaN:+t}xi(Cn);xi(oa).center;class ia{constructor(){this._partials=new Float64Array(32),this._n=0}add(e){const a=this._partials;let i=0;for(let s=0;s<this._n&&s<32;s++){const d=a[s],g=e+d,u=Math.abs(e)<Math.abs(d)?e-(g-d):d-(g-e);u&&(a[i++]=u),e=g}return a[i]=e,this._n=i+1,this}valueOf(){const e=this._partials;let a=this._n,i,s,d,g=0;if(a>0){for(g=e[--a];a>0&&(i=g,s=e[--a],g=i+s,d=s-(g-i),!d););a>0&&(d<0&&e[a-1]<0||d>0&&e[a-1]>0)&&(s=d*2,i=g+s,s==i-g&&(g=i))}return g}}function*aa(t){for(const e of t)yield*e}function wi(t){return Array.from(aa(t))}var ae=1e-6,K=Math.PI,Le=K/2,Oo=K/4,Be=K*2,Oe=180/K,xe=K/180,pe=Math.abs,bi=Math.atan,un=Math.atan2,he=Math.cos,ra=Math.exp,sa=Math.log,ve=Math.sin,la=Math.sign||function(t){return t>0?1:t<0?-1:0},$n=Math.sqrt,ca=Math.tan;function ua(t){return t>1?0:t<-1?K:Math.acos(t)}function fn(t){return t>1?Le:t<-1?-Le:Math.asin(t)}function an(){}function Ln(t,e){t&&Uo.hasOwnProperty(t.type)&&Uo[t.type](t,e)}var Io={Feature:function(t,e){Ln(t.geometry,e)},FeatureCollection:function(t,e){for(var a=t.features,i=-1,s=a.length;++i<s;)Ln(a[i].geometry,e)}},Uo={Sphere:function(t,e){e.sphere()},Point:function(t,e){t=t.coordinates,e.point(t[0],t[1],t[2])},MultiPoint:function(t,e){for(var a=t.coordinates,i=-1,s=a.length;++i<s;)t=a[i],e.point(t[0],t[1],t[2])},LineString:function(t,e){co(t.coordinates,e,0)},MultiLineString:function(t,e){for(var a=t.coordinates,i=-1,s=a.length;++i<s;)co(a[i],e,0)},Polygon:function(t,e){$o(t.coordinates,e)},MultiPolygon:function(t,e){for(var a=t.coordinates,i=-1,s=a.length;++i<s;)$o(a[i],e)},GeometryCollection:function(t,e){for(var a=t.geometries,i=-1,s=a.length;++i<s;)Ln(a[i],e)}};function co(t,e,a){var i=-1,s=t.length-a,d;for(e.lineStart();++i<s;)d=t[i],e.point(d[0],d[1],d[2]);e.lineEnd()}function $o(t,e){var a=-1,i=t.length;for(e.polygonStart();++a<i;)co(t[a],e,1);e.polygonEnd()}function fa(t,e){t&&Io.hasOwnProperty(t.type)?Io[t.type](t,e):Ln(t,e)}function uo(t){return[un(t[1],t[0]),fn(t[2])]}function Bt(t){var e=t[0],a=t[1],i=he(a);return[i*he(e),i*ve(e),ve(a)]}function wn(t,e){return t[0]*e[0]+t[1]*e[1]+t[2]*e[2]}function Pn(t,e){return[t[1]*e[2]-t[2]*e[1],t[2]*e[0]-t[0]*e[2],t[0]*e[1]-t[1]*e[0]]}function no(t,e){t[0]+=e[0],t[1]+=e[1],t[2]+=e[2]}function bn(t,e){return[t[0]*e,t[1]*e,t[2]*e]}function fo(t){var e=$n(t[0]*t[0]+t[1]*t[1]+t[2]*t[2]);t[0]/=e,t[1]/=e,t[2]/=e}function po(t,e){function a(i,s){return i=t(i,s),e(i[0],i[1])}return t.invert&&e.invert&&(a.invert=function(i,s){return i=e.invert(i,s),i&&t.invert(i[0],i[1])}),a}function mo(t,e){return pe(t)>K&&(t-=Math.round(t/Be)*Be),[t,e]}mo.invert=mo;function Si(t,e,a){return(t%=Be)?e||a?po(Wo(t),Fo(e,a)):Wo(t):e||a?Fo(e,a):mo}function Bo(t){return function(e,a){return e+=t,pe(e)>K&&(e-=Math.round(e/Be)*Be),[e,a]}}function Wo(t){var e=Bo(t);return e.invert=Bo(-t),e}function Fo(t,e){var a=he(t),i=ve(t),s=he(e),d=ve(e);function g(u,b){var y=he(b),c=he(u)*y,f=ve(u)*y,m=ve(b),T=m*a+c*i;return[un(f*s-T*d,c*a-m*i),fn(T*s+f*d)]}return g.invert=function(u,b){var y=he(b),c=he(u)*y,f=ve(u)*y,m=ve(b),T=m*s-f*d;return[un(f*s+m*d,c*a+T*i),fn(T*a-c*i)]},g}function da(t){t=Si(t[0]*xe,t[1]*xe,t.length>2?t[2]*xe:0);function e(a){return a=t(a[0]*xe,a[1]*xe),a[0]*=Oe,a[1]*=Oe,a}return e.invert=function(a){return a=t.invert(a[0]*xe,a[1]*xe),a[0]*=Oe,a[1]*=Oe,a},e}function pa(t,e,a,i,s,d){if(a){var g=he(e),u=ve(e),b=i*a;s==null?(s=e+i*Be,d=e-b/2):(s=Ho(g,s),d=Ho(g,d),(i>0?s<d:s>d)&&(s+=i*Be));for(var y,c=s;i>0?c>d:c<d;c-=b)y=uo([g,-u*he(c),-u*ve(c)]),t.point(y[0],y[1])}}function Ho(t,e){e=Bt(e),e[0]-=t,fo(e);var a=ua(-e[1]);return((-e[2]<0?-a:a)+Be-ae)%Be}function Mi(){var t=[],e;return{point:function(a,i,s){e.push([a,i,s])},lineStart:function(){t.push(e=[])},lineEnd:an,rejoin:function(){t.length>1&&t.push(t.pop().concat(t.shift()))},result:function(){var a=t;return t=[],e=null,a}}}function Dn(t,e){return pe(t[0]-e[0])<ae&&pe(t[1]-e[1])<ae}function Sn(t,e,a,i){this.x=t,this.z=e,this.o=a,this.e=i,this.v=!1,this.n=this.p=null}function Ei(t,e,a,i,s){var d=[],g=[],u,b;if(t.forEach(function(C){if(!((k=C.length-1)<=0)){var k,E=C[0],R=C[k],U;if(Dn(E,R)){if(!E[2]&&!R[2]){for(s.lineStart(),u=0;u<k;++u)s.point((E=C[u])[0],E[1]);s.lineEnd();return}R[0]+=2*ae}d.push(U=new Sn(E,C,null,!0)),g.push(U.o=new Sn(E,null,U,!1)),d.push(U=new Sn(R,C,null,!1)),g.push(U.o=new Sn(R,null,U,!0))}}),!!d.length){for(g.sort(e),No(d),No(g),u=0,b=g.length;u<b;++u)g[u].e=a=!a;for(var y=d[0],c,f;;){for(var m=y,T=!0;m.v;)if((m=m.n)===y)return;c=m.z,s.lineStart();do{if(m.v=m.o.v=!0,m.e){if(T)for(u=0,b=c.length;u<b;++u)s.point((f=c[u])[0],f[1]);else i(m.x,m.n.x,1,s);m=m.n}else{if(T)for(c=m.p.z,u=c.length-1;u>=0;--u)s.point((f=c[u])[0],f[1]);else i(m.x,m.p.x,-1,s);m=m.p}m=m.o,c=m.z,T=!T}while(!m.v);s.lineEnd()}}}function No(t){if(e=t.length){for(var e,a=0,i=t[0],s;++a<e;)i.n=s=t[a],s.p=i,i=s;i.n=s=t[0],s.p=i}}function oo(t){return pe(t[0])<=K?t[0]:la(t[0])*((pe(t[0])+K)%Be-K)}function ma(t,e){var a=oo(e),i=e[1],s=ve(i),d=[ve(a),-he(a),0],g=0,u=0,b=new ia;s===1?i=Le+ae:s===-1&&(i=-Le-ae);for(var y=0,c=t.length;y<c;++y)if(m=(f=t[y]).length)for(var f,m,T=f[m-1],C=oo(T),k=T[1]/2+Oo,E=ve(k),R=he(k),U=0;U<m;++U,C=_,E=O,R=$,T=P){var P=f[U],_=oo(P),n=P[1]/2+Oo,O=ve(n),$=he(n),W=_-C,G=W>=0?1:-1,N=G*W,B=N>K,J=E*O;if(b.add(un(J*G*ve(N),R*$+J*he(N))),g+=B?W+G*Be:W,B^C>=a^_>=a){var Q=Pn(Bt(T),Bt(P));fo(Q);var q=Pn(d,Q);fo(q);var D=(B^W>=0?-1:1)*fn(q[2]);(i>D||i===D&&(Q[0]||Q[1]))&&(u+=B^W>=0?1:-1)}}return(g<-ae||g<ae&&b<-1e-12)^u&1}function zi(t,e,a,i){return function(s){var d=e(s),g=Mi(),u=e(g),b=!1,y,c,f,m={point:T,lineStart:k,lineEnd:E,polygonStart:function(){m.point=R,m.lineStart=U,m.lineEnd=P,c=[],y=[]},polygonEnd:function(){m.point=T,m.lineStart=k,m.lineEnd=E,c=wi(c);var _=ma(y,i);c.length?(b||(s.polygonStart(),b=!0),Ei(c,va,_,a,s)):_&&(b||(s.polygonStart(),b=!0),s.lineStart(),a(null,null,1,s),s.lineEnd()),b&&(s.polygonEnd(),b=!1),c=y=null},sphere:function(){s.polygonStart(),s.lineStart(),a(null,null,1,s),s.lineEnd(),s.polygonEnd()}};function T(_,n){t(_,n)&&s.point(_,n)}function C(_,n){d.point(_,n)}function k(){m.point=C,d.lineStart()}function E(){m.point=T,d.lineEnd()}function R(_,n){f.push([_,n]),u.point(_,n)}function U(){u.lineStart(),f=[]}function P(){R(f[0][0],f[0][1]),u.lineEnd();var _=u.clean(),n=g.result(),O,$=n.length,W,G,N;if(f.pop(),y.push(f),f=null,!!$){if(_&1){if(G=n[0],(W=G.length-1)>0){for(b||(s.polygonStart(),b=!0),s.lineStart(),O=0;O<W;++O)s.point((N=G[O])[0],N[1]);s.lineEnd()}return}$>1&&_&2&&n.push(n.pop().concat(n.shift())),c.push(n.filter(ha))}}return m}}function ha(t){return t.length>1}function va(t,e){return((t=t.x)[0]<0?t[1]-Le-ae:Le-t[1])-((e=e.x)[0]<0?e[1]-Le-ae:Le-e[1])}var Go=zi(function(){return!0},ga,xa,[-K,-Le]);function ga(t){var e=NaN,a=NaN,i=NaN,s;return{lineStart:function(){t.lineStart(),s=1},point:function(d,g){var u=d>0?K:-K,b=pe(d-e);pe(b-K)<ae?(t.point(e,a=(a+g)/2>0?Le:-Le),t.point(i,a),t.lineEnd(),t.lineStart(),t.point(u,a),t.point(d,a),s=0):i!==u&&b>=K&&(pe(e-i)<ae&&(e-=i*ae),pe(d-u)<ae&&(d-=u*ae),a=ya(e,a,d,g),t.point(i,a),t.lineEnd(),t.lineStart(),t.point(u,a),s=0),t.point(e=d,a=g),i=u},lineEnd:function(){t.lineEnd(),e=a=NaN},clean:function(){return 2-s}}}function ya(t,e,a,i){var s,d,g=ve(t-a);return pe(g)>ae?bi((ve(e)*(d=he(i))*ve(a)-ve(i)*(s=he(e))*ve(t))/(s*d*g)):(e+i)/2}function xa(t,e,a,i){var s;if(t==null)s=a*Le,i.point(-K,s),i.point(0,s),i.point(K,s),i.point(K,0),i.point(K,-s),i.point(0,-s),i.point(-K,-s),i.point(-K,0),i.point(-K,s);else if(pe(t[0]-e[0])>ae){var d=t[0]<e[0]?K:-K;s=a*d/2,i.point(-d,s),i.point(0,s),i.point(d,s)}else i.point(e[0],e[1])}function wa(t){var e=he(t),a=2*xe,i=e>0,s=pe(e)>ae;function d(c,f,m,T){pa(T,t,a,m,c,f)}function g(c,f){return he(c)*he(f)>e}function u(c){var f,m,T,C,k;return{lineStart:function(){C=T=!1,k=1},point:function(E,R){var U=[E,R],P,_=g(E,R),n=i?_?0:y(E,R):_?y(E+(E<0?K:-K),R):0;if(!f&&(C=T=_)&&c.lineStart(),_!==T&&(P=b(f,U),(!P||Dn(f,P)||Dn(U,P))&&(U[2]=1)),_!==T)k=0,_?(c.lineStart(),P=b(U,f),c.point(P[0],P[1])):(P=b(f,U),c.point(P[0],P[1],2),c.lineEnd()),f=P;else if(s&&f&&i^_){var O;!(n&m)&&(O=b(U,f,!0))&&(k=0,i?(c.lineStart(),c.point(O[0][0],O[0][1]),c.point(O[1][0],O[1][1]),c.lineEnd()):(c.point(O[1][0],O[1][1]),c.lineEnd(),c.lineStart(),c.point(O[0][0],O[0][1],3)))}_&&(!f||!Dn(f,U))&&c.point(U[0],U[1]),f=U,T=_,m=n},lineEnd:function(){T&&c.lineEnd(),f=null},clean:function(){return k|(C&&T)<<1}}}function b(c,f,m){var T=Bt(c),C=Bt(f),k=[1,0,0],E=Pn(T,C),R=wn(E,E),U=E[0],P=R-U*U;if(!P)return!m&&c;var _=e*R/P,n=-e*U/P,O=Pn(k,E),$=bn(k,_),W=bn(E,n);no($,W);var G=O,N=wn($,G),B=wn(G,G),J=N*N-B*(wn($,$)-1);if(!(J<0)){var Q=$n(J),q=bn(G,(-N-Q)/B);if(no(q,$),q=uo(q),!m)return q;var D=c[0],X=f[0],Y=c[1],ge=f[1],F;X<D&&(F=D,D=X,X=F);var fe=X-D,we=pe(fe-K)<ae,me=we||fe<ae;if(!we&&ge<Y&&(F=Y,Y=ge,ge=F),me?we?Y+ge>0^q[1]<(pe(q[0]-D)<ae?Y:ge):Y<=q[1]&&q[1]<=ge:fe>K^(D<=q[0]&&q[0]<=X)){var Pe=bn(G,(-N+Q)/B);return no(Pe,$),[q,uo(Pe)]}}}function y(c,f){var m=i?t:K-t,T=0;return c<-m?T|=1:c>m&&(T|=2),f<-m?T|=4:f>m&&(T|=8),T}return zi(g,u,d,i?[0,-t]:[-K,t-K])}function ba(t,e,a,i,s,d){var g=t[0],u=t[1],b=e[0],y=e[1],c=0,f=1,m=b-g,T=y-u,C;if(C=a-g,!(!m&&C>0)){if(C/=m,m<0){if(C<c)return;C<f&&(f=C)}else if(m>0){if(C>f)return;C>c&&(c=C)}if(C=s-g,!(!m&&C<0)){if(C/=m,m<0){if(C>f)return;C>c&&(c=C)}else if(m>0){if(C<c)return;C<f&&(f=C)}if(C=i-u,!(!T&&C>0)){if(C/=T,T<0){if(C<c)return;C<f&&(f=C)}else if(T>0){if(C>f)return;C>c&&(c=C)}if(C=d-u,!(!T&&C<0)){if(C/=T,T<0){if(C>f)return;C>c&&(c=C)}else if(T>0){if(C<c)return;C<f&&(f=C)}return c>0&&(t[0]=g+c*m,t[1]=u+c*T),f<1&&(e[0]=g+f*m,e[1]=u+f*T),!0}}}}}var rn=1e9,Mn=-rn;function Sa(t,e,a,i){function s(y,c){return t<=y&&y<=a&&e<=c&&c<=i}function d(y,c,f,m){var T=0,C=0;if(y==null||(T=g(y,f))!==(C=g(c,f))||b(y,c)<0^f>0)do m.point(T===0||T===3?t:a,T>1?i:e);while((T=(T+f+4)%4)!==C);else m.point(c[0],c[1])}function g(y,c){return pe(y[0]-t)<ae?c>0?0:3:pe(y[0]-a)<ae?c>0?2:1:pe(y[1]-e)<ae?c>0?1:0:c>0?3:2}function u(y,c){return b(y.x,c.x)}function b(y,c){var f=g(y,1),m=g(c,1);return f!==m?f-m:f===0?c[1]-y[1]:f===1?y[0]-c[0]:f===2?y[1]-c[1]:c[0]-y[0]}return function(y){var c=y,f=Mi(),m,T,C,k,E,R,U,P,_,n,O,$={point:W,lineStart:J,lineEnd:Q,polygonStart:N,polygonEnd:B};function W(D,X){s(D,X)&&c.point(D,X)}function G(){for(var D=0,X=0,Y=T.length;X<Y;++X)for(var ge=T[X],F=1,fe=ge.length,we=ge[0],me,Pe,_e=we[0],He=we[1];F<fe;++F)me=_e,Pe=He,we=ge[F],_e=we[0],He=we[1],Pe<=i?He>i&&(_e-me)*(i-Pe)>(He-Pe)*(t-me)&&++D:He<=i&&(_e-me)*(i-Pe)<(He-Pe)*(t-me)&&--D;return D}function N(){c=f,m=[],T=[],O=!0}function B(){var D=G(),X=O&&D,Y=(m=wi(m)).length;(X||Y)&&(y.polygonStart(),X&&(y.lineStart(),d(null,null,1,y),y.lineEnd()),Y&&Ei(m,u,D,d,y),y.polygonEnd()),c=y,m=T=C=null}function J(){$.point=q,T&&T.push(C=[]),n=!0,_=!1,U=P=NaN}function Q(){m&&(q(k,E),R&&_&&f.rejoin(),m.push(f.result())),$.point=W,_&&c.lineEnd()}function q(D,X){var Y=s(D,X);if(T&&C.push([D,X]),n)k=D,E=X,R=Y,n=!1,Y&&(c.lineStart(),c.point(D,X));else if(Y&&_)c.point(D,X);else{var ge=[U=Math.max(Mn,Math.min(rn,U)),P=Math.max(Mn,Math.min(rn,P))],F=[D=Math.max(Mn,Math.min(rn,D)),X=Math.max(Mn,Math.min(rn,X))];ba(ge,F,t,e,a,i)?(_||(c.lineStart(),c.point(ge[0],ge[1])),c.point(F[0],F[1]),Y||c.lineEnd(),O=!1):Y&&(c.lineStart(),c.point(D,X),O=!1)}U=D,P=X,_=Y}return $}}var jo=t=>t,Wt=1/0,_n=Wt,dn=-Wt,kn=dn,qo={point:Ma,lineStart:an,lineEnd:an,polygonStart:an,polygonEnd:an,result:function(){var t=[[Wt,_n],[dn,kn]];return dn=kn=-(_n=Wt=1/0),t}};function Ma(t,e){t<Wt&&(Wt=t),t>dn&&(dn=t),e<_n&&(_n=e),e>kn&&(kn=e)}function Mo(t){return function(e){var a=new ho;for(var i in t)a[i]=t[i];return a.stream=e,a}}function ho(){}ho.prototype={constructor:ho,point:function(t,e){this.stream.point(t,e)},sphere:function(){this.stream.sphere()},lineStart:function(){this.stream.lineStart()},lineEnd:function(){this.stream.lineEnd()},polygonStart:function(){this.stream.polygonStart()},polygonEnd:function(){this.stream.polygonEnd()}};function Eo(t,e,a){var i=t.clipExtent&&t.clipExtent();return t.scale(150).translate([0,0]),i!=null&&t.clipExtent(null),fa(a,t.stream(qo)),e(qo.result()),i!=null&&t.clipExtent(i),t}function Ti(t,e,a){return Eo(t,function(i){var s=e[1][0]-e[0][0],d=e[1][1]-e[0][1],g=Math.min(s/(i[1][0]-i[0][0]),d/(i[1][1]-i[0][1])),u=+e[0][0]+(s-g*(i[1][0]+i[0][0]))/2,b=+e[0][1]+(d-g*(i[1][1]+i[0][1]))/2;t.scale(150*g).translate([u,b])},a)}function Ea(t,e,a){return Ti(t,[[0,0],e],a)}function za(t,e,a){return Eo(t,function(i){var s=+e,d=s/(i[1][0]-i[0][0]),g=(s-d*(i[1][0]+i[0][0]))/2,u=-d*i[0][1];t.scale(150*d).translate([g,u])},a)}function Ta(t,e,a){return Eo(t,function(i){var s=+e,d=s/(i[1][1]-i[0][1]),g=-d*i[0][0],u=(s-d*(i[1][1]+i[0][1]))/2;t.scale(150*d).translate([g,u])},a)}var Vo=16,Ca=he(30*xe);function Zo(t,e){return+e?Aa(t,e):Da(t)}function Da(t){return Mo({point:function(e,a){e=t(e,a),this.stream.point(e[0],e[1])}})}function Aa(t,e){function a(i,s,d,g,u,b,y,c,f,m,T,C,k,E){var R=y-i,U=c-s,P=R*R+U*U;if(P>4*e&&k--){var _=g+m,n=u+T,O=b+C,$=$n(_*_+n*n+O*O),W=fn(O/=$),G=pe(pe(O)-1)<ae||pe(d-f)<ae?(d+f)/2:un(n,_),N=t(G,W),B=N[0],J=N[1],Q=B-i,q=J-s,D=U*Q-R*q;(D*D/P>e||pe((R*Q+U*q)/P-.5)>.3||g*m+u*T+b*C<Ca)&&(a(i,s,d,g,u,b,B,J,G,_/=$,n/=$,O,k,E),E.point(B,J),a(B,J,G,_,n,O,y,c,f,m,T,C,k,E))}}return function(i){var s,d,g,u,b,y,c,f,m,T,C,k,E={point:R,lineStart:U,lineEnd:_,polygonStart:function(){i.polygonStart(),E.lineStart=n},polygonEnd:function(){i.polygonEnd(),E.lineStart=U}};function R(W,G){W=t(W,G),i.point(W[0],W[1])}function U(){f=NaN,E.point=P,i.lineStart()}function P(W,G){var N=Bt([W,G]),B=t(W,G);a(f,m,c,T,C,k,f=B[0],m=B[1],c=W,T=N[0],C=N[1],k=N[2],Vo,i),i.point(f,m)}function _(){E.point=R,i.lineEnd()}function n(){U(),E.point=O,E.lineEnd=$}function O(W,G){P(s=W,G),d=f,g=m,u=T,b=C,y=k,E.point=P}function $(){a(f,m,c,T,C,k,d,g,s,u,b,y,Vo,i),E.lineEnd=_,_()}return E}}var La=Mo({point:function(t,e){this.stream.point(t*xe,e*xe)}});function Pa(t){return Mo({point:function(e,a){var i=t(e,a);return this.stream.point(i[0],i[1])}})}function _a(t,e,a,i,s){function d(g,u){return g*=i,u*=s,[e+t*g,a-t*u]}return d.invert=function(g,u){return[(g-e)/t*i,(a-u)/t*s]},d}function Xo(t,e,a,i,s,d){if(!d)return _a(t,e,a,i,s);var g=he(d),u=ve(d),b=g*t,y=u*t,c=g/t,f=u/t,m=(u*a-g*e)/t,T=(u*e+g*a)/t;function C(k,E){return k*=i,E*=s,[b*k-y*E+e,a-y*k-b*E]}return C.invert=function(k,E){return[i*(c*k-f*E+m),s*(T-f*k-c*E)]},C}function ka(t){return Ra(function(){return t})()}function Ra(t){var e,a=150,i=480,s=250,d=0,g=0,u=0,b=0,y=0,c,f=0,m=1,T=1,C=null,k=Go,E=null,R,U,P,_=jo,n=.5,O,$,W,G,N;function B(D){return W(D[0]*xe,D[1]*xe)}function J(D){return D=W.invert(D[0],D[1]),D&&[D[0]*Oe,D[1]*Oe]}B.stream=function(D){return G&&N===D?G:G=La(Pa(c)(k(O(_(N=D)))))},B.preclip=function(D){return arguments.length?(k=D,C=void 0,q()):k},B.postclip=function(D){return arguments.length?(_=D,E=R=U=P=null,q()):_},B.clipAngle=function(D){return arguments.length?(k=+D?wa(C=D*xe):(C=null,Go),q()):C*Oe},B.clipExtent=function(D){return arguments.length?(_=D==null?(E=R=U=P=null,jo):Sa(E=+D[0][0],R=+D[0][1],U=+D[1][0],P=+D[1][1]),q()):E==null?null:[[E,R],[U,P]]},B.scale=function(D){return arguments.length?(a=+D,Q()):a},B.translate=function(D){return arguments.length?(i=+D[0],s=+D[1],Q()):[i,s]},B.center=function(D){return arguments.length?(d=D[0]%360*xe,g=D[1]%360*xe,Q()):[d*Oe,g*Oe]},B.rotate=function(D){return arguments.length?(u=D[0]%360*xe,b=D[1]%360*xe,y=D.length>2?D[2]%360*xe:0,Q()):[u*Oe,b*Oe,y*Oe]},B.angle=function(D){return arguments.length?(f=D%360*xe,Q()):f*Oe},B.reflectX=function(D){return arguments.length?(m=D?-1:1,Q()):m<0},B.reflectY=function(D){return arguments.length?(T=D?-1:1,Q()):T<0},B.precision=function(D){return arguments.length?(O=Zo($,n=D*D),q()):$n(n)},B.fitExtent=function(D,X){return Ti(B,D,X)},B.fitSize=function(D,X){return Ea(B,D,X)},B.fitWidth=function(D,X){return za(B,D,X)},B.fitHeight=function(D,X){return Ta(B,D,X)};function Q(){var D=Xo(a,0,0,m,T,f).apply(null,e(d,g)),X=Xo(a,i-D[0],s-D[1],m,T,f);return c=Si(u,b,y),$=po(e,X),W=po(c,$),O=Zo($,n),q()}function q(){return G=N=null,B}return function(){return e=t.apply(this,arguments),B.invert=e.invert&&J,Q()}}function zo(t,e){return[t,sa(ca((Le+e)/2))]}zo.invert=function(t,e){return[t,2*bi(ra(e))-Le]};function To(){return Oa(zo).scale(961/Be)}function Oa(t){var e=ka(t),a=e.center,i=e.scale,s=e.translate,d=e.clipExtent,g=null,u,b,y;e.scale=function(f){return arguments.length?(i(f),c()):i()},e.translate=function(f){return arguments.length?(s(f),c()):s()},e.center=function(f){return arguments.length?(a(f),c()):a()},e.clipExtent=function(f){return arguments.length?(f==null?g=u=b=y=null:(g=+f[0][0],u=+f[0][1],b=+f[1][0],y=+f[1][1]),c()):g==null?null:[[g,u],[b,y]]};function c(){var f=K*i(),m=e(da(e.rotate()).invert([0,0]));return d(g==null?[[m[0]-f,m[1]-f],[m[0]+f,m[1]+f]]:t===zo?[[Math.max(m[0]-f,g),u],[Math.min(m[0]+f,b),y]]:[[g,Math.max(m[1]-f,u)],[b,Math.min(m[1]+f,y)]])}return c()}function Qo(t,e){return[t,e]}Qo.invert=Qo;const it={A:{id:"A",label:"Zona A",range:"0–15 km",flete:20},B:{id:"B",label:"Zona B",range:"15–30 km",flete:30},C:{id:"C",label:"Zona C",range:"30–45 km",flete:40},D:{id:"D",label:"Zona D",range:"+45 km",flete:null}},Ae={"la-libertad":{name:"La Libertad",capital:"Santa Tecla",km:32,minutes:37,zone:"B"},"santa-ana":{name:"Santa Ana",capital:"Santa Ana",km:28,minutes:32,zone:"C"},"san-salvador":{name:"San Salvador",capital:"San Salvador",km:47.8,minutes:49,zone:"C"},sonsonate:{name:"Sonsonate",capital:"Sonsonate",km:56.7,minutes:57,zone:"D"},ahuachapan:{name:"Ahuachapán",capital:"Ahuachapán",km:58.2,minutes:56,zone:"D"},cuscatlan:{name:"Cuscatlán",capital:"Cojutepeque",km:78.9,minutes:76,zone:"D"},"la-paz":{name:"La Paz",capital:"Zacatecoluca",km:96.3,minutes:107,zone:"D"},"san-vicente":{name:"San Vicente",capital:"San Vicente",km:101.9,minutes:98,zone:"D"},chalatenango:{name:"Chalatenango",capital:"Chalatenango",km:105.8,minutes:100,zone:"D"},cabanas:{name:"Cabañas",capital:"Sensuntepeque",km:125.4,minutes:130,zone:"D"},usulutan:{name:"Usulután",capital:"Usulután",km:153.3,minutes:174,zone:"D"},"san-miguel":{name:"San Miguel",capital:"San Miguel",km:177.8,minutes:168,zone:"D"},morazan:{name:"Morazán",capital:"San Francisco Gotera",km:207.3,minutes:194,zone:"D"},"la-union":{name:"La Unión",capital:"La Unión",km:223.1,minutes:206,zone:"D"}};function Ya(t){var e;return((e=Ae[t])==null?void 0:e.zone)??null}function Ka(t){var e;return((e=Ae[t])==null?void 0:e.km)??null}function Rn(t){var e;return((e=it[t])==null?void 0:e.flete)??null}const oe={ink:"#0b1118",brand:"#2463d0",blueLight:"#4d8df5",cyan:"#7cc4ff",amber:"#e09a3e",stone:"#e9e6e1"},be="'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",vo="'Archivo', 'Inter', system-ui, sans-serif",An="'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",Ci=100,_t=2.4,wt=.1,De=_t+wt,Yo=.11,go=t=>{var e;return(e=it[t])!=null&&e.flete?`$${it[t].flete}`:"Cotizar"},Te=(t,e,a)=>Math.min(a,Math.max(e,t)),yo=t=>1-Math.pow(1-Te(t,0,1),3),$t=t=>(t=Te(t,0,1),t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2),xt={blending:Zi,blendEquation:Vi,blendSrc:Jn,blendDst:Jn,blendSrcAlpha:qi,blendDstAlpha:Jn},Ce=(t,e,a,i)=>t+(e-t)*(1-Math.exp(-a*i)),Ko="svm-styles-v1";function Di(){if(document.getElementById(Ko))return;const t=document.createElement("style");t.id=Ko,t.textContent=`
.svm-root{position:absolute;inset:0;overflow:hidden;font-family:${be};-webkit-font-smoothing:antialiased;color:#fff;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
.svm-root canvas{position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;touch-action:pan-y}
.svm-root.svm-hot canvas{cursor:pointer}
.svm-layer{position:absolute;inset:0;pointer-events:none;contain:layout style}
.svm-lbl{position:absolute;left:0;top:0;white-space:nowrap;will-change:transform,opacity;transition:opacity .35s ease;opacity:0}
.svm-lbl.svm-on{opacity:1}
.svm-dept{font:600 9.5px/1 ${be};letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.42);text-shadow:0 1px 6px rgba(5,10,16,.9)}
.svm-dept.svm-strong{color:rgba(255,255,255,.88)}
.svm-dest{font:500 11px/1 ${be};color:rgba(255,255,255,.78);text-shadow:0 1px 8px rgba(5,10,16,.95);padding-left:2px}
.svm-dest.svm-hl{color:#fff}
.svm-q{display:flex;align-items:center;gap:8px;padding:7px 11px 7px 9px;border-radius:999px;background:rgba(11,17,24,.78);border:1px solid rgba(224,154,62,.45);box-shadow:0 8px 28px rgba(0,0,0,.45),0 0 0 4px rgba(224,154,62,.06);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font:500 12px/1 ${be};color:rgba(255,255,255,.72)}
.svm-q b{font:700 12.5px/1 ${vo};color:#fff;letter-spacing:.01em}
.svm-q i{width:8px;height:8px;border-radius:50%;background:${oe.amber};box-shadow:0 0 0 3px rgba(224,154,62,.25),0 0 12px ${oe.amber};flex:none;animation:svm-blink 2.2s ease-in-out infinite}
.svm-anchor{display:flex;align-items:center;gap:7px;padding:5px 9px 5px 6px;border-radius:8px;background:rgba(11,17,24,.72);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font:600 11px/1 ${be};color:#fff}
.svm-anchor em{font-style:normal;font:700 8.5px/1 ${be};letter-spacing:.14em;text-transform:uppercase;color:${oe.ink};background:${oe.amber};padding:4px 5px;border-radius:4px}
@keyframes svm-blink{0%,100%{box-shadow:0 0 0 3px rgba(224,154,62,.25),0 0 12px ${oe.amber}}50%{box-shadow:0 0 0 6px rgba(224,154,62,.08),0 0 18px ${oe.amber}}}
.svm-pop{position:absolute;left:0;top:0;pointer-events:none;opacity:0;transform:translate3d(-9999px,0,0);transition:opacity .18s ease;will-change:transform,opacity;z-index:5}
.svm-pop.svm-on{opacity:1}
.svm-card{min-width:228px;max-width:270px;padding:14px 15px 13px;border-radius:14px;background:linear-gradient(180deg,rgba(20,32,46,.92),rgba(11,17,24,.92));border:1px solid rgba(255,255,255,.1);box-shadow:0 18px 50px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.06);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
.svm-k{font:600 9.5px/1 ${be};letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.5);display:flex;align-items:center;gap:7px}
.svm-t{font:700 17px/1.15 ${vo};color:#fff;margin-top:8px;letter-spacing:-.005em}
.svm-sub{font:500 11.5px/1.3 ${be};color:${oe.amber};margin-top:4px}
.svm-grid{display:grid;grid-template-columns:repeat(3,auto);gap:10px 16px;margin-top:12px;padding-top:11px;border-top:1px solid rgba(255,255,255,.08)}
.svm-grid span{display:block;font:500 9.5px/1 ${be};letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:6px}
.svm-grid b{font:600 14px/1 ${An};color:#fff;letter-spacing:-.02em}
.svm-grid b.svm-amber{color:${oe.amber}}
.svm-chip{display:inline-flex;align-items:center;justify-content:center;font:700 9px/1 ${be};letter-spacing:.12em;text-transform:uppercase;padding:4px 6px;border-radius:5px;color:#fff;background:rgba(77,141,245,.22);border:1px solid rgba(124,196,255,.35)}
.svm-chip.z-A{background:rgba(36,99,208,.55);border-color:rgba(124,196,255,.6)}
.svm-chip.z-B{background:rgba(36,99,208,.35)}
.svm-chip.z-C{background:rgba(77,141,245,.16)}
.svm-chip.z-D{background:rgba(224,154,62,.16);border-color:rgba(224,154,62,.45);color:#f3c88d}
.svm-tip{padding:10px 12px 10px;border-radius:11px;background:rgba(11,17,24,.88);border:1px solid rgba(255,255,255,.1);box-shadow:0 12px 34px rgba(0,0,0,.5);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);min-width:170px}
.svm-tip .svm-t{font-size:14.5px;margin-top:6px}
.svm-row{display:flex;align-items:center;gap:8px;margin-top:8px;font:500 11.5px/1 ${be};color:rgba(255,255,255,.6)}
.svm-mono{font-family:${An};color:#fff;font-size:12px}
.svm-row .svm-amber{color:${oe.amber};font-family:${An};font-size:12px}
.svm-hint{margin-top:8px;font:500 10.5px/1 ${be};color:rgba(124,196,255,.85)}
@media (max-width:640px){.svm-card{min-width:200px;padding:12px 13px}.svm-t{font-size:15px}.svm-grid b{font-size:13px}.svm-q{font-size:11px;padding:6px 9px 6px 8px}.svm-q b{font-size:11.5px}}
@media (prefers-reduced-motion:reduce){.svm-q i{animation:none}.svm-lbl,.svm-pop{transition:none}}
`,document.head.appendChild(t)}function Ai(t){const e=[];for(const s of t){const d=e[e.length-1];(!d||Math.hypot(s[0]-d[0],s[1]-d[1])>1e-4)&&e.push(s)}const a=e[0],i=e[e.length-1];return e.length>1&&Math.hypot(a[0]-i[0],a[1]-i[1])<1e-4&&e.pop(),e}function Co(t){let e=0;for(let a=0,i=t.length;a<i;a++){const s=t[a],d=t[(a+1)%i];e+=s[0]*d[1]-d[0]*s[1]}return e/2}function On(t,e){const a=t.length,i=Co(t)>0?1:-1,s=new Array(a);for(let d=0;d<a;d++){const g=t[(d-1+a)%a],u=t[d],b=t[(d+1)%a];let y=u[0]-g[0],c=u[1]-g[1],f=b[0]-u[0],m=b[1]-u[1];const T=Math.hypot(y,c)||1,C=Math.hypot(f,m)||1;y/=T,c/=T,f/=C,m/=C;const k=-c*i,E=y*i,R=-m*i,U=f*i;let P=k+R,_=E+U;const n=Math.hypot(P,_);n<1e-6?(P=k,_=E):(P/=n,_/=n);const O=Math.max(P*k+_*E,.4),$=e/O;s[d]=[u[0]+P*$,u[1]+_*$]}return s}function Li(t){let e=0,a=0,i=0;for(let s=0,d=t.length;s<d;s++){const g=t[s],u=t[(s+1)%d],b=g[0]*u[1]-u[0]*g[1];e+=b,a+=(g[0]+u[0])*b,i+=(g[1]+u[1])*b}return e/=2,[a/(6*e),i/(6*e)]}function Pi(t,e){const a=t.length,i=new Float32Array(a);for(let m=1;m<a;m++)i[m]=i[m-1]+Math.hypot(t[m][0]-t[m-1][0],t[m][1]-t[m-1][1]);const s=i[a-1]||1,d=e/2,g=new Float32Array(a*2*3),u=new Float32Array(a*2),b=new Float32Array(a*2),y=new Float32Array(a*2);for(let m=0;m<a;m++){const T=t[m],C=t[Math.max(0,m-1)],k=t[Math.min(a-1,m+1)];let E=0,R=0;const U=(n,O)=>{const $=O[0]-n[0],W=O[1]-n[1],G=Math.hypot($,W)||1;return[-W/G,$/G]};if(m>0){const n=U(C,T);E+=n[0],R+=n[1]}if(m<a-1){const n=U(T,k);E+=n[0],R+=n[1]}let P=Math.hypot(E,R)||1;E/=P,R/=P;let _=1;if(m>0&&m<a-1){const n=U(T,k);_=1/Math.max(.55,E*n[0]+R*n[1])}for(let n=0;n<2;n++){const O=n===0?-1:1,$=m*2+n;g[$*3]=T[0]+E*d*_*O,g[$*3+1]=0,g[$*3+2]=T[1]+R*d*_*O,u[$]=i[m]/s,b[$]=O,y[$]=i[m]}}const c=[];for(let m=0;m<a-1;m++){const T=m*2,C=T+1,k=T+2,E=T+3;c.push(T,k,C,C,k,E)}const f=new hi;return f.setAttribute("position",new vn(g,3)),f.setAttribute("aT",new vn(u,1)),f.setAttribute("aSide",new vn(b,1)),f.setAttribute("aD",new vn(y,1)),f.setIndex(c),{geometry:f,cum:i,total:s}}function Jo(t){const e=[],a=[],i=[];for(const{geo:d,color:g}of t){const u=d.index?d.toNonIndexed():d,b=new ce(g),y=u.attributes.position.array,c=u.attributes.normal.array;for(let f=0;f<y.length;f++)e.push(y[f]),a.push(c[f]);for(let f=0;f<y.length/3;f++)i.push(b.r,b.g,b.b);u.dispose(),u!==d&&d.dispose()}const s=new hi;return s.setAttribute("position",new sn(e,3)),s.setAttribute("normal",new sn(a,3)),s.setAttribute("color",new sn(i,3)),s}function nt(t,e,a,i,s,d){const g=new ri(t,e,a);return g.translate(i,s,d),g}const Ia={chassis:"#2a3542",cab:oe.stone,glass:"#8fd0ff",roof:"#ffffff",bedFloor:"#b46f22",bedSide:oe.amber,bedBack:"#c9852f",bedFront:"#d38d34",wheel:"#0d1117",load:"#cfc7b8"};function _i(t=Ia){const e=[{geo:nt(1,.1,.36,0,.13,0),color:t.chassis},{geo:nt(.27,.27,.37,.36,.32,0),color:t.cab},{geo:nt(.03,.12,.31,.5,.36,0),color:t.glass},{geo:nt(.2,.05,.38,.37,.47,0),color:t.roof},{geo:nt(.62,.05,.4,-.15,.2,0),color:t.bedFloor},{geo:nt(.62,.22,.04,-.15,.32,.18),color:t.bedSide},{geo:nt(.62,.22,.04,-.15,.32,-.18),color:t.bedSide},{geo:nt(.04,.22,.4,-.45,.32,0),color:t.bedBack},{geo:nt(.05,.28,.4,.15,.35,0),color:t.bedFront}];for(const s of[.33,-.12,-.33])for(const d of[.17,-.17]){const g=new cn(.085,.085,.07,10);g.rotateX(Math.PI/2),g.translate(s,.085,d),e.push({geo:g,color:t.wheel})}const a=new cn(0,.26,.16,6,1);a.scale(1.25,1,.7),a.translate(-.15,.48,0);const i=Jo([{geo:a,color:t.load}]);return{body:Jo(e),load:i}}const ki=`
attribute float aT; attribute float aSide; attribute float aD;
varying float vT; varying float vSide; varying float vD;
void main(){ vT=aT; vSide=aSide; vD=aD; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,Ua=`
uniform float uTime; uniform float uDraw; uniform float uOpacity; uniform float uHl; uniform float uMotion; uniform float uLen; uniform float uPhase;
uniform vec3 uCol; uniform vec3 uPulse;
varying float vT; varying float vSide; varying float vD;
void main(){
  if (vT > uDraw) discard;
  float s = abs(vSide);
  float cw = mix(0.34, 0.5, uHl);
  float core = 1.0 - smoothstep(cw*0.55, cw, s);
  float glow = exp(-s*s*mix(5.0, 3.0, uHl));
  float p = fract(vD/7.0 - uTime*0.42 + uPhase);
  float pulse = pow(p, 14.0) * uMotion;
  float head = uDraw < 0.999 ? exp(-max(uDraw - vT, 0.0)*uLen*0.9) : 0.0;
  float start = smoothstep(0.0, 1.2, vD); // se funde al salir de la cantera
  vec3 col = uCol*(core*0.62 + glow*0.14)*(1.0+uHl*1.1)
           + uPulse*pulse*(core*1.5 + glow*0.5)
           + vec3(1.0,0.86,0.62)*head*(core*1.8+glow*0.8);
  gl_FragColor = vec4(col*uOpacity*mix(0.35,1.0,start), 1.0);
}`,Ot="varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",$a=`
uniform float uTime; uniform float uSpeed; uniform float uPhase; uniform vec3 uCol; uniform float uOpacity; uniform float uCount; uniform float uCore;
varying vec2 vUv;
void main(){
  float d = length(vUv-0.5)*2.0;
  float a = 0.0;
  for (int i=0;i<3;i++){
    if (float(i) >= uCount) break;
    float r = fract(uTime*uSpeed + uPhase + float(i)/uCount);
    float w = 0.035 + r*0.03;
    a += (1.0 - smoothstep(0.0, w, abs(d - r))) * pow(1.0 - r, 1.6);
  }
  a += exp(-d*d*28.0)*uCore;
  a *= 1.0 - smoothstep(0.92, 1.0, d);
  gl_FragColor = vec4(uCol*a*uOpacity, 1.0);
}`,io=`
uniform vec3 uCol; uniform float uOpacity; uniform float uPow; varying vec2 vUv;
void main(){ float d = length(vUv-0.5)*2.0; float a = pow(max(1.0-d,0.0), uPow); gl_FragColor = vec4(uCol*a*uOpacity,1.0); }`,Ba=`
uniform vec3 uCol; uniform float uOpacity; uniform float uTime; varying vec2 vUv;
void main(){
  float a = pow(1.0 - vUv.y, 2.2);
  float flick = 0.85 + 0.15*sin(uTime*3.0 + vUv.y*14.0);
  float edge = 1.0 - abs(vUv.x*2.0-1.0);
  gl_FragColor = vec4(uCol*a*flick*uOpacity*(0.35+0.65*edge),1.0);
}`,Ri="varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0); }",Wa="varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }",Fa=`
uniform float uOpacity; uniform vec3 uCol; varying vec3 vW;
void main(){
  vec2 g = vW.xz/5.0; vec2 f = abs(fract(g-0.5)-0.5)/fwidth(g);
  float line = 1.0 - min(min(f.x,f.y),1.0);
  vec2 G = vW.xz/25.0; vec2 F = abs(fract(G-0.5)-0.5)/fwidth(G);
  float major = 1.0 - min(min(F.x,F.y),1.0);
  float fade = exp(-length(vW.xz*vec2(0.85,1.25))/52.0);
  gl_FragColor = vec4(uCol*(line*0.35+major*0.6)*fade*uOpacity,1.0);
}`;function Ja(t,e={}){var en,tn;const a={mode:"routes",intro:!0,labels:!0,geoUrl:new URL("data/sv-departamentos.geojson",document.baseURI).href,routesUrl:new URL("data/rutas.json",document.baseURI).href,...e},i=a.mode==="select"?"select":"routes";if(a.theme==="light"&&i==="routes")return Xa(t,a);const s=((en=window.matchMedia)==null?void 0:en.call(window,"(prefers-reduced-motion: reduce)").matches)??!1,d=((tn=window.matchMedia)==null?void 0:tn.call(window,"(max-width: 760px), (pointer: coarse)").matches)??!1,g=!s;if(Di(),!Oi())return Ii(t,a,i);getComputedStyle(t).position==="static"&&(t.style.position="relative");const u=document.createElement("div");u.className="svm-root svm-mode-"+i;const b=document.createElement("div");b.className="svm-layer";const y=document.createElement("div");y.className="svm-pop",b.appendChild(y);const c=new si({antialias:!0,alpha:!0,powerPreference:"high-performance"});c.setClearColor(0,0),c.outputColorSpace=ln,c.toneMapping=Hi,c.toneMappingExposure=1.05,c.shadowMap.enabled=!0,c.shadowMap.type=Ni;const f=1.5;c.setPixelRatio(Math.min(window.devicePixelRatio||1,f)),u.appendChild(c.domElement),u.appendChild(b),t.appendChild(u),c.domElement.setAttribute("aria-label",i==="routes"?"Mapa 3D de rutas de entrega de Cantera JOB en El Salvador":"Mapa de El Salvador para seleccionar departamento"),c.domElement.setAttribute("role","img");const m=new bo,T=new li(c),C=T.fromScene(new yi,.04).texture;m.environment=C;const k=new ci(i==="routes"?26:24,1,1,2e3);m.add(new ui(13624319,725272,.3));const E=new Tn(16777215,1.35);E.position.set(-38,90,-30),E.castShadow=!0,E.shadow.mapSize.set(d?1024:2048,d?1024:2048),Object.assign(E.shadow.camera,{left:-64,right:64,top:44,bottom:-44,near:10,far:220}),E.shadow.bias=-6e-4,E.shadow.normalBias=.03,E.shadow.radius=4,m.add(E);const R=new Tn(8176895,.9);R.position.set(30,25,-70),m.add(R);const U=new Tn(16769727,.35);U.position.set(40,30,60),m.add(U);const P=new ct;m.add(P);const _={uTime:{value:0},uQ:{value:new It},uMotion:{value:g?1:0}},n={ready:!1,destroyed:!1,visible:!1,tabVisible:!document.hidden,raf:0,last:0,time:0,introDone:!1,introT:-1,deptIntroT:-1,focus:null,hoverDept:null,hoverRoute:null,selected:null,pointer:{x:0,y:0,nx:0,ny:0,inside:!1,dirty:!1,touch:!1},parallax:{x:0,y:0},size:{w:1,h:1},statsKey:"",statsT:0,pending:[]},O=new Map,$=[],W=[],G=[];let N=null,B=null,J=null;const Q={},q=[];let D=null,X=null,Y=[0,0];const ge=new pi,F=new ne,fe=new wo,we=new mi,me=new ne,Pe=new ne(0,1,0),_e=(o,l)=>{const r=X([o,l]);return[r[0]-Y[0],r[1]-Y[1]]},He=i==="routes"?["#2c6ce2","#22529f","#1d4177","#19335b","#162a45"]:["#1f3a5a","#1d3654","#1b324e","#1a2f49","#192c45"];function St(o){var r;if(o==="la-libertad")return 0;const l=((r=Ae[o])==null?void 0:r.km)??999;return l<50?1:l<60?2:l<110?3:4}function Bn(o){const l=new Fe({color:o,roughness:.7,metalness:.05,envMapIntensity:.22}),r={value:0},x={value:0},z={value:0};return l.userData={uHl:r,uSel:x,uDim:z,base:new ce(o)},l.onBeforeCompile=p=>{p.uniforms.uTime=_.uTime,p.uniforms.uQ=_.uQ,p.uniforms.uMotion=_.uMotion,p.uniforms.uHl=l.userData.uHl,p.uniforms.uSel=l.userData.uSel,p.uniforms.uDim=l.userData.uDim,p.uniforms.uSonar={value:i==="routes"?1:.35},p.vertexShader=p.vertexShader.replace("#include <common>",`#include <common>
varying vec3 vWPos;`).replace("#include <project_vertex>",`#include <project_vertex>
vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`),p.fragmentShader=p.fragmentShader.replace("#include <common>",`#include <common>
varying vec3 vWPos; uniform float uTime; uniform vec2 uQ; uniform float uMotion; uniform float uHl; uniform float uSel; uniform float uDim; uniform float uSonar;`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
          vec2 g = vWPos.xz;
          vec2 cell = fract(g / 1.25) - 0.5;
          float dotm = 1.0 - smoothstep(0.045, 0.1, length(cell));
          float dq = length(g - uQ);
          float heat = exp(-dq / 13.0);
          float w = fract(dq / 30.0 - uTime * 0.09);
          float sonar = pow(w, 160.0) * 0.8 * exp(-dq / 40.0) * uSonar * uMotion;
          vec3 glowC = vec3(0.30, 0.56, 1.0);
          totalEmissiveRadiance += glowC * (heat * 0.10 + sonar * 0.22) * (1.0 - uDim * 0.8);
          totalEmissiveRadiance += vec3(0.75, 0.88, 1.0) * dotm * (0.05 + uHl * 0.04) * (1.0 - uDim * 0.7);
          totalEmissiveRadiance += glowC * uHl * 0.07 + vec3(0.08, 0.26, 0.80) * uSel * 0.2;`)},l.customProgramCacheKey=()=>"svm-cap-"+i,l}function Wn(o){const l=new ce(o).multiplyScalar(.42),r=new Fe({color:l,roughness:.55,metalness:.15,envMapIntensity:.35}),x={value:0},z={value:0};return r.userData={uHl:x,uSel:z,base:l.clone()},r.onBeforeCompile=p=>{p.uniforms.uHl=x,p.uniforms.uSel=z,p.vertexShader=p.vertexShader.replace("#include <common>",`#include <common>
varying float vLy;`).replace("#include <project_vertex>",`#include <project_vertex>
vLy = position.y;`),p.fragmentShader=p.fragmentShader.replace("#include <common>",`#include <common>
varying float vLy; uniform float uHl; uniform float uSel;`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
          float topF = smoothstep(${(_t*.35).toFixed(3)}, ${(_t+wt).toFixed(3)}, vLy);
          totalEmissiveRadiance += vec3(0.24,0.5,1.0) * topF * (0.08 + uHl*0.22 + uSel*0.45);`)},r.customProgramCacheKey=()=>"svm-side",r}function Fn(o,l){var M;const r=[];for(const v of o.features){const w=v.geometry.type==="Polygon"?[v.geometry.coordinates]:v.geometry.coordinates;for(const I of w)for(const L of I[0])r.push(L)}X=To().fitWidth(Ci,{type:"MultiPoint",coordinates:r});let x=1e9,z=-1e9,p=1e9,h=-1e9;for(const v of r){const w=X(v);x=Math.min(x,w[0]),z=Math.max(z,w[0]),p=Math.min(p,w[1]),h=Math.max(h,w[1])}Y=[(x+z)/2,(p+h)/2],D={minX:x-Y[0],maxX:z-Y[0],minZ:p-Y[1],maxZ:h-Y[1]};const S=_e(l.origin.lon,l.origin.lat);_.uQ.value.set(S[0],S[1]);for(const v of o.features){const w=v.properties.id,I=v.properties.name||((M=Ae[w])==null?void 0:M.name)||w,L=St(w),j=He[L],H=Bn(j),V=Wn(j),Z=new Un({color:new ce(oe.cyan),linewidth:d?.9:1.1,transparent:!0,opacity:i==="routes"?.38:.3,depthWrite:!1}),te=new ct;te.userData.id=w;const se=[],le=v.geometry.type==="Polygon"?[v.geometry.coordinates]:v.geometry.coordinates;let ie=0,ue=[0,0];for(const Re of le){const Dt=Ai(Re[0].map(de=>_e(de[0],de[1])));if(Dt.length<3)continue;const Je=Math.abs(Co(Dt)),et=Je<3,At=et?Yo*.35:Yo,gt=On(Dt.map(de=>[de[0],-de[1]]),At),Yn=new fi(gt.map(de=>new It(de[0],de[1]))),lt=new di(Yn,et?{depth:_t,bevelEnabled:!1,curveSegments:1}:{depth:_t,bevelEnabled:!0,bevelThickness:wt,bevelSize:wt,bevelOffset:-wt,bevelSegments:2,curveSegments:1});et&&lt.translate(0,0,wt*0),lt.rotateX(-Math.PI/2),q.push(lt);const tt=new ee(lt,[H,V]);tt.castShadow=!0,tt.receiveShadow=!0,tt.userData.id=w,te.add(tt),se.push(tt);const nn=et?gt:On(gt,wt),Kn=(et?_t:De)+.035,on=[];for(const de of nn.concat([nn[0]]))on.push(de[0],Kn,-de[1]);const yt=new So;yt.setPositions(on),q.push(yt);const Lt=new gi(yt,Z);Lt.computeLineDistances(),Lt.renderOrder=1,te.add(Lt),Je>ie&&(ie=Je,ue=Li(Dt))}const ye={"la-libertad":[.6,2.2],"san-salvador":[.4,-.6],"la-union":[-1.2,-.6],usulutan:[0,-1.2],"la-paz":[0,.5]};ye[w]&&(ue[0]+=ye[w][0],ue[1]+=ye[w][1]),P.add(te),q.push(H,V,Z);const Ne={id:w,name:I,group:te,capMat:H,sideMat:V,edgeMat:Z,meshes:se,tier:L,lift:0,liftT:0,grow:1,labelPt:ue};O.set(w,Ne),a.labels&&ut({kind:"dept",id:w,html:I,pos:new ne(ue[0],De+.2,ue[1]),prio:i==="select"?60:20})}[...O.values()].sort((v,w)=>Math.hypot(v.labelPt[0]-S[0],v.labelPt[1]-S[1])-Math.hypot(w.labelPt[0]-S[0],w.labelPt[1]-S[1])).forEach((v,w)=>{v.growDelay=w*.07}),Hn(),Nn(S,l.origin),i==="routes"&&(Gn(l),g&&jn())}function Hn(){const o=new ee(new ot(260,180),new ji({opacity:.55,depthWrite:!1}));o.rotation.x=-Math.PI/2,o.position.y=-.12,o.receiveShadow=!0,o.renderOrder=-2,P.add(o),q.push(o.geometry,o.material);const l=new $e({vertexShader:Wa,fragmentShader:Fa,transparent:!0,depthWrite:!1,...xt,uniforms:{uOpacity:{value:i==="routes"?.16:.1},uCol:{value:new ce(oe.cyan)}}}),r=new ee(new ot(260,180),l);r.rotation.x=-Math.PI/2,r.position.y=-.16,r.renderOrder=-3,P.add(r),q.push(r.geometry,l);const x=new ee(new ot(150,95),new $e({vertexShader:Ot,fragmentShader:io,transparent:!0,depthWrite:!1,...xt,uniforms:{uCol:{value:new ce("#1f5fd0")},uOpacity:{value:.22},uPow:{value:2.2}}}));x.rotation.x=-Math.PI/2,x.position.y=-.2,x.renderOrder=-4,P.add(x),q.push(x.geometry,x.material)}function Mt(o,l,r,x){const z=new ee(new ot(o,o),new $e({vertexShader:Ot,fragmentShader:io,transparent:!0,depthWrite:!1,depthTest:!1,...xt,uniforms:{uCol:{value:new ce(l)},uOpacity:{value:r},uPow:{value:x}}}));return z.rotation.x=-Math.PI/2,q.push(z.geometry,z.material),z}function Ft(o,l,r,x,z,p,h=0){const S=new ee(new ot(o,o),new $e({vertexShader:Ot,fragmentShader:$a,transparent:!0,depthWrite:!1,depthTest:!1,...xt,uniforms:{uTime:_.uTime,uSpeed:{value:x},uPhase:{value:h},uCol:{value:new ce(l)},uOpacity:{value:r},uCount:{value:z},uCore:{value:p}}}));return S.rotation.x=-Math.PI/2,q.push(S.geometry,S.material),S}function Nn(o,l){const r=new ct;r.position.set(o[0],De,o[1]);const x=Mt(i==="routes"?9:6,oe.amber,.38,2.8);x.position.y=.06,x.renderOrder=4,r.add(x);const z=Ft(i==="routes"?13:8,oe.amber,g?1:.6,g?.32:0,3,.9);z.position.y=.08,z.renderOrder=4,r.add(z);const p=new cn(.62,.78,.55,6);p.translate(0,.28,0);const h=new Fe({color:oe.amber,emissive:new ce(oe.amber),emissiveIntensity:.65,roughness:.35,metalness:.2}),S=new ee(p,h);S.castShadow=!0,r.add(S);const A=new cn(.34,.5,.3,6);A.translate(0,.7,0);const M=new ee(A,new Fe({color:"#fff4e2",emissive:new ce("#ffcf8a"),emissiveIntensity:.9,roughness:.3}));r.add(M);const v=i==="routes"?9:5,w=new cn(.42,.42,v,24,1,!0);w.translate(0,v/2+.3,0);const I=new $e({vertexShader:Ot,fragmentShader:Ba,transparent:!0,depthWrite:!1,...xt,side:so,uniforms:{uCol:{value:new ce(oe.amber)},uOpacity:{value:.75},uTime:_.uTime}}),L=new ee(w,I);L.renderOrder=5,r.add(L),q.push(p,h,A,M.material,w,I),P.add(r),Object.assign(Q,{group:r,hex:S,beam:L,beamM:I,rings:z,glow:x,pos:o}),ut({kind:"quarry",html:'<div class="svm-q"><i></i><b>Cantera JOB</b><span>· Ciudad Arce</span></div>',pos:new ne(o[0],De+(i==="routes"?2.4:1.6),o[1]),prio:1e3,anchor:"topleft"})}function Gn(o){[...o.routes].sort((r,x)=>r.km-x.km).forEach((r,x)=>{const z=r.coordinates.map(ie=>_e(ie[0],ie[1])),{geometry:p,cum:h,total:S}=Pi(z,d?1.15:.95),A=new $e({vertexShader:ki,fragmentShader:Ua,transparent:!0,depthWrite:!1,depthTest:!1,...xt,side:so,uniforms:{uTime:_.uTime,uMotion:_.uMotion,uDraw:{value:g?0:1},uOpacity:{value:1},uHl:{value:0},uLen:{value:S},uPhase:{value:x*.137%1},uCol:{value:new ce(r.anchor?"#9fd4ff":oe.blueLight)},uPulse:{value:new ce(oe.amber)}}}),M=new ee(p,A);M.position.y=De+.06,M.renderOrder=2,P.add(M),q.push(p,A);const v=_e(r.dest[0],r.dest[1]),w=z[z.length-1],I=[w[0],w[1]],L=new ct;L.position.set(I[0],De,I[1]);const j=Ft(r.anchor?5:3.2,r.anchor?oe.amber:oe.cyan,r.anchor?.9:.55,g?r.anchor?.38:.22:0,r.anchor?2:1,.8,x*.31%1);j.position.y=.07,j.renderOrder=3,L.add(j);const H=new Xi(r.anchor?.3:.2,16,12);H.translate(0,.32,0);const V=new Rt({color:r.anchor?"#ffd9a3":"#e6f4ff"}),Z=new ee(H,V);L.add(Z),q.push(H,V),P.add(L);const te=.9+x*.17,se=.55+1.1*Math.sqrt(S/70),le={data:r,mesh:M,mat:A,pts:z,cum:h,total:S,pin:L,pinRing:j,dot:Z,startAt:te,drawDur:se,opacity:1,hl:0,drawn:!g,dest:v};$.push(le),a.labels&&(le.label=ut({kind:"dest",id:r.id,html:r.anchor?'<div class="svm-anchor"><em>Cliente ancla</em>Condado Quetzal</div>':r.name,pos:new ne(I[0],De+(r.anchor?.8:.5),I[1]),prio:r.anchor?500:r.zone==="D"&&r.km>60?40:10,anchor:r.anchor?"topright":"right",route:le}))})}function jn(){const o=a.trucks??(d?12:30),l=$.map(L=>L),r=$.find(L=>L.data.anchor),x=[];r&&x.push(r,r);const z=[...$].sort((L,j)=>j.total-L.total);let p=0;for(;l.length+x.length<o;)x.push(z[p%Math.min(8,z.length)]),p++;const h=l.concat(x).slice(0,o),S=_i();q.push(S.body,S.load);const A=new Fe({vertexColors:!0,roughness:.45,metalness:.15,emissive:new ce("#1a1408"),envMapIntensity:.9}),M=new Fe({vertexColors:!0,roughness:.9,metalness:0});N=new Ut(S.body,A,h.length),B=new Ut(S.load,M,h.length),N.castShadow=!d,N.renderOrder=6,B.renderOrder=6,N.frustumCulled=!1,B.frustumCulled=!1;const v=new ot(1,1);v.rotateX(-Math.PI/2);const w=new $e({vertexShader:Ri,fragmentShader:io,transparent:!0,depthWrite:!1,depthTest:!1,...xt,uniforms:{uCol:{value:new ce(oe.amber)},uOpacity:{value:.75},uPow:{value:2.6}}});J=new Ut(v,w,h.length),J.renderOrder=5,J.frustumCulled=!1,q.push(A,M,v,w),P.add(J,N,B);const I=new Map;h.forEach((L,j)=>{const H=I.get(L)||0;I.set(L,H+1);const V=Te(L.total/4.2,3.2,17),Z=1.1,te=2*V+2*Z;G.push({r:L,oneWay:V,pause:Z,period:te,offset:(H*.37+j*.618%1)*te,vis:0,moving:!1,yaw:0})})}function ut(o){var x;const l=document.createElement("div");l.className="svm-lbl "+(o.kind==="dept"?"svm-dept":o.kind==="dest"&&!((x=o.route)!=null&&x.data.anchor)?"svm-dest":""),l.innerHTML=o.html,b.insertBefore(l,y);const r={...o,el:l,w:0,h:0,x:-1e4,y:-1e4,on:!1,force:!1,hide:!1};return W.push(r),r}function Et(){const{w:o,h:l}=n.size,r=[],x=p=>p.prio+(p.force?2e3:0)+(n.focus&&p.route&&p.route.data.zone===n.focus?100:0),z=W.slice().sort((p,h)=>x(h)-x(p));for(const p of z){p.w||(p.w=p.el.offsetWidth,p.h=p.el.offsetHeight);let h=!p.hide&&(n.introDone||!g||p.kind==="quarry"||p.kind==="dept");if(p.kind==="dept"){const w=O.get(p.id);w&&w.grow<.6&&(h=!1)}if(p.kind==="dest"&&p.route){p.route.drawn||(h=!1),p.route.opacity<.5&&(h=!1);const w=n.focus&&p.route.data.zone===n.focus;p.prio<=10&&!p.force&&!w&&(h=!1)}if(F.copy(p.pos),p.kind==="dept"){const w=O.get(p.id);F.y=(De+.2)*((w==null?void 0:w.grow)??1)+((w==null?void 0:w.lift)??0)}F.project(k);let S=(F.x*.5+.5)*o,A=(-F.y*.5+.5)*l;p.anchor==="bottom"?(S-=p.w/2,A-=p.h):p.anchor==="topleft"?(S-=p.w-18,A-=p.h+6):p.anchor==="topright"?(S+=6,A-=p.h+4):p.anchor==="right"?(S+=9,A-=p.h/2):(S-=p.w/2,A-=p.h/2);const M=3,v=[S-M,A-M,S+p.w+M,A+p.h+M];if(h&&F.z<1){for(const w of r)if(v[0]<w[2]&&v[2]>w[0]&&v[1]<w[3]&&v[3]>w[1]){h=!1;break}(v[0]<0||v[2]>o||v[1]<0||v[3]>l)&&(h=p.kind==="quarry")}else h=!1;h&&r.push(v),(Math.abs(S-p.x)>.25||Math.abs(A-p.y)>.25)&&(p.x=S,p.y=A,p.el.style.transform=`translate3d(${S.toFixed(1)}px,${A.toFixed(1)}px,0)`),h!==p.on&&(p.on=h,p.el.classList.toggle("svm-on",h))}}const Se=i==="routes"?{polar:Ve.degToRad(d?36:40),az:Ve.degToRad(d?-8:-16),margin:d?.015:.03,shiftZ:0}:{polar:Ve.degToRad(24),az:Ve.degToRad(-6),margin:.03,shiftZ:0};let re=150;const ke=new ne;function Ie(o,l,r){k.position.set(ke.x+r*Math.sin(o)*Math.sin(l),ke.y+r*Math.cos(o),ke.z+r*Math.sin(o)*Math.cos(l)),k.lookAt(ke)}const ft={...Se};function qn(){if(!D)return;const o=k.aspect<1.1;Se.az=o?Ve.degToRad(i==="routes"?-26:-20):ft.az,Se.polar=o?Ve.degToRad(i==="routes"?44:34):ft.polar,ke.set((D.minX+D.maxX)/2,0,(D.minZ+D.maxZ)/2+Se.shiftZ);const l=[];for(const p of[D.minX,D.maxX])for(const h of[D.minZ,D.maxZ])for(const S of[-.2,De+1])l.push(new ne(p,S,h));for(const p of O.values())for(const h of p.meshes){const S=h.geometry.attributes.position.array;for(let A=0;A<S.length;A+=3*37)l.push(new ne(S[A],S[A+1]>.5?De:0,S[A+2]))}const r=1-Se.margin*2,x=new ne,z=new ne;for(let p=0;p<3;p++){let h=10,S=1500;for(let V=0;V<36;V++){const Z=(h+S)/2;Ie(Se.polar,Se.az,Z),k.updateMatrixWorld();let te=9,se=-9,le=9,ie=-9;for(const ue of l)F.copy(ue).project(k),te=Math.min(te,F.x),se=Math.max(se,F.x),le=Math.min(le,F.y),ie=Math.max(ie,F.y);(se-te)/2<=r&&(ie-le)/2<=r?S=Z:h=Z}re=S,Ie(Se.polar,Se.az,re),k.updateMatrixWorld();let A=9,M=-9,v=9,w=-9;for(const V of l)F.copy(V).project(k),A=Math.min(A,F.x),M=Math.max(M,F.x),v=Math.min(v,F.y),w=Math.max(w,F.y);const I=(A+M)/2,L=(v+w)/2,j=Math.tan(Ve.degToRad(k.fov/2))*re,H=j*k.aspect;x.setFromMatrixColumn(k.matrixWorld,0),x.y=0,x.normalize(),z.set(-Math.sin(Se.az),0,-Math.cos(Se.az)),ke.addScaledVector(x,I*H),ke.addScaledVector(z,L*j/Math.cos(Se.polar))}Ie(Se.polar,Se.az,re)}function dt(){const o=Math.max(1,t.clientWidth),l=Math.max(1,t.clientHeight);n.size={w:o,h:l},c.setPixelRatio(Math.min(window.devicePixelRatio||1,f)),c.setSize(o,l,!1),k.aspect=o/l,k.updateProjectionMatrix();for(const r of O.values())r.edgeMat.resolution.set(o,l);qn();for(const r of W)r.w=0;n.ready&&ht(0)}function Ue(o){const l=c.domElement.getBoundingClientRect();n.pointer.x=o.clientX-l.left,n.pointer.y=o.clientY-l.top,n.pointer.nx=n.pointer.x/l.width*2-1,n.pointer.ny=-(n.pointer.y/l.height)*2+1,n.pointer.inside=!0,n.pointer.dirty=!0}const Ht=o=>{n.pointer.touch=o.pointerType==="touch",!n.pointer.touch&&Ue(o)},Nt=()=>{n.pointer.inside=!1,n.pointer.dirty=!0};let Xe=null;const Qe=o=>{Xe={x:o.clientX,y:o.clientY,t:performance.now()}},Gt=o=>{if(!Xe)return;const l=Math.hypot(o.clientX-Xe.x,o.clientY-Xe.y),r=performance.now()-Xe.t;Xe=null,!(l>10||r>600)&&(Ue(o),n.pointer.touch=o.pointerType==="touch",at(!0),i==="select"&&n.hoverDept&&rt(n.hoverDept,!0))},We=c.domElement;We.addEventListener("pointermove",Ht),We.addEventListener("pointerleave",Nt),We.addEventListener("pointerdown",Qe),We.addEventListener("pointerup",Gt);function pt(o,l,r){return F.set(o,l,r).project(k),[(F.x*.5+.5)*n.size.w,(-F.y*.5+.5)*n.size.h]}function Vn(o,l,r,x){const z=x[0]-r[0],p=x[1]-r[1],h=z*z+p*p||1,S=Te(((o-r[0])*z+(l-r[1])*p)/h,0,1);return Math.hypot(o-r[0]-S*z,l-r[1]-S*p)}function at(o=!1){n.pointer.dirty=!1;let l=null,r=null;if(n.pointer.inside){const{x,y:z}=n.pointer;if(i==="routes"){let p=o?26:16;for(const h of $){if(!h.drawn||h.opacity<.4)continue;const S=pt(h.pts[h.pts.length-1][0],De,h.pts[h.pts.length-1][1]),A=Math.hypot(S[0]-x,S[1]-z);A<p&&(p=A,l=h)}if(!l){let h=o?14:7;for(const S of $){if(!S.drawn||S.opacity<.4)continue;let A=null;for(let M=0;M<S.pts.length;M++){const v=pt(S.pts[M][0],De,S.pts[M][1]);if(A){const w=Vn(x,z,A,v);w<h&&(h=w,l=S)}A=v}}}}if(!l){ge.setFromCamera({x:n.pointer.nx,y:n.pointer.ny},k);const p=[];for(const S of O.values())p.push(...S.meshes);const h=ge.intersectObjects(p,!1)[0];h&&(r=h.object.userData.id)}}if(l!==n.hoverRoute||r!==n.hoverDept){n.hoverRoute=l,n.hoverDept=r,u.classList.toggle("svm-hot",!!(l||r));for(const x of W)x.kind==="dest"&&(x.force=!!l&&x.route===l,x.el.classList.toggle("svm-hl",x.force));for(const x of W)x.kind==="dept"&&x.el.classList.toggle("svm-strong",x.id===r||x.id===n.selected);jt()}n.hoverDept&&!n.hoverRoute&&zt()}function jt(){var o;if(n.hoverRoute){const l=n.hoverRoute.data,r=l.zone;y.innerHTML=`<div class="svm-card">
        <div class="svm-k"><span class="svm-chip z-${r}">Zona ${r}</span>Ruta desde Ciudad Arce</div>
        <div class="svm-t">${l.anchor?"Condado Quetzal":l.name}</div>
        ${l.anchor?'<div class="svm-sub">Quezaltepeque · desarrollo propio del grupo</div>':""}
        <div class="svm-grid">
          <div><span>Distancia</span><b>${l.km.toFixed(1)} km</b></div>
          <div><span>Tiempo</span><b>${l.minutes} min</b></div>
          <div><span>Flete/viaje</span><b class="svm-amber">${go(r)}</b></div>
        </div></div>`,y.classList.add("svm-on"),zt()}else if(n.hoverDept){const l=Ae[n.hoverDept]||{},r=O.get(n.hoverDept),x=l.zone||"D";y.innerHTML=i==="routes"?`<div class="svm-tip"><div class="svm-k">Departamento</div><div class="svm-t">${(r==null?void 0:r.name)||""}</div>
            <div class="svm-row"><span class="svm-chip z-${x}">Zona ${x}</span><span class="svm-mono">~${Math.round(l.km)} km</span><span>a ${l.capital}</span></div>
            <div class="svm-row">Flete aprox. <span class="svm-amber">${go(x)}${(o=it[x])!=null&&o.flete?" / viaje":""}</span></div></div>`:`<div class="svm-tip"><div class="svm-k">Departamento</div><div class="svm-t">${(r==null?void 0:r.name)||""}</div>
            <div class="svm-row"><span class="svm-chip z-${x}">Zona ${x}</span><span class="svm-mono">~${Math.round(l.km)} km</span></div>
            <div class="svm-hint">${n.selected===n.hoverDept?"Seleccionado":"Clic para seleccionar"}</div></div>`,y.classList.add("svm-on"),zt()}else y.classList.remove("svm-on")}function zt(){const{w:o,h:l}=n.size,r=y.offsetWidth,x=y.offsetHeight;let z,p;if(n.hoverRoute){const h=n.hoverRoute.pts[n.hoverRoute.pts.length-1],S=pt(h[0],De+.5,h[1]);z=S[0]+18,p=S[1]-x-14,z+r>o-8&&(z=S[0]-r-18),p<8&&(p=S[1]+18)}else z=n.pointer.x+16,p=n.pointer.y+18,z+r>o-8&&(z=n.pointer.x-r-16),p+x>l-8&&(p=n.pointer.y-x-14);z=Te(z,6,Math.max(6,o-r-6)),p=Te(p,6,Math.max(6,l-x-6)),y.style.transform=`translate3d(${z.toFixed(1)}px,${p.toFixed(1)}px,0)`}function rt(o,l=!1){if(!n.ready){n.pending.push(()=>rt(o,l));return}if(!(o&&!O.has(o))){n.selected=o||null;for(const r of W)r.kind==="dept"&&r.el.classList.toggle("svm-strong",r.id===n.selected||r.id===n.hoverDept);if(n.hoverDept&&jt(),l&&o&&typeof a.onSelect=="function"){const r=Ae[o];a.onSelect({id:o,name:O.get(o).name,km_from_quarry_approx:(r==null?void 0:r.km)??null,zone:(r==null?void 0:r.zone)??null,capital:(r==null?void 0:r.capital)??null,flete:Rn(r==null?void 0:r.zone)})}}}function pn(o){if(!n.ready){n.pending.push(()=>pn(o));return}n.focus=o&&it[o]?o:null}function Tt(){if(!n.ready){n.pending.push(()=>Tt());return}if(g){n.introT=0,n.introDone=!1;for(const o of $)o.drawn=!1,o.mat.uniforms.uDraw.value=0}}a.selected&&rt(a.selected);function st(o){return!n.focus||o.data.zone===n.focus}function qt(o,l,r){const x=l*o.total,z=o.cum;let p=0,h=z.length-1;for(;h-p>1;){const M=p+h>>1;z[M]<=x?p=M:h=M}const S=z[h]-z[p]||1,A=(x-z[p])/S;return r[0]=o.pts[p][0]+(o.pts[h][0]-o.pts[p][0])*A,r[1]=o.pts[p][1]+(o.pts[h][1]-o.pts[p][1])*A,r}const mt=[0,0],Ct=[0,0];function mn(o){n.time+=g?o:0,_.uTime.value=n.time;const l=n.time;if(n.deptIntroT>=0){n.deptIntroT+=o;for(const v of O.values())v.grow=.02+.98*yo((n.deptIntroT-v.growDelay)/1.1);n.deptIntroT>2.4&&(n.deptIntroT=-1)}if(n.introT>=0){n.introT+=o;let v=!0;for(const I of $){const L=$t((n.introT-I.startAt)/I.drawDur);I.mat.uniforms.uDraw.value=L,L>=1?I.drawn=!0:v=!1}const w=yo((n.introT-.3)/.9);Q.group&&Q.group.scale.setScalar(Math.max(.001,w)),v&&n.introT>1&&(n.introT=-1,n.introDone=!0)}const r=i==="select";for(const v of O.values()){const w=v.id===n.hoverDept&&!n.hoverRoute,I=v.id===n.selected,L=I?.9:w?r?.6:.42:0;v.lift=s?L:Ce(v.lift,L,10,o),v.group.position.y=v.lift,v.group.scale.y=v.grow;const j=v.capMat.userData,H=v.sideMat.userData;j.uHl.value=Ce(j.uHl.value,w?1:0,12,o),j.uSel.value=Ce(j.uSel.value,I?1:0,10,o),H.uHl.value=j.uHl.value,H.uSel.value=j.uSel.value;const V=r&&n.selected&&!I?1:0;j.uDim.value=Ce(j.uDim.value,V,8,o);const Z=I?hn:j.base;v.capMat.color.lerp(Z,1-Math.exp(-10*o)),V&&v.capMat.color.lerp(Ye,(1-Math.exp(-6*o))*.6),v.edgeMat.opacity=Ce(v.edgeMat.opacity,I?1:w?.95:V?.16:r?.3:.38,10,o),v.edgeMat.color.lerp(I||w?Zn:Vt,1-Math.exp(-10*o))}let x=0,z=0;for(const v of $){const w=st(v);w&&(x+=v.data.km,z++);const I=v===n.hoverRoute,L=w?n.hoverRoute&&!I?.3:1:.07;v.opacity=Ce(v.opacity,L,8,o),v.hl=Ce(v.hl,I?1:n.focus&&w?.35:0,10,o),v.mat.uniforms.uOpacity.value=v.opacity,v.mat.uniforms.uHl.value=v.hl;const H=(.001+(v.drawn?1:0)*(.55+.45*v.opacity))*(1+v.hl*.35);v.pin.scale.setScalar(H)}let p=0;if(N){const v=d?1.9:1.25;G.forEach((w,I)=>{const L=w.r,j=L.drawn&&st(L)&&(!n.hoverRoute||n.hoverRoute===L)?1:L.drawn&&st(L)?.35:0;w.vis=Ce(w.vis,j,5,o);const H=((l+w.offset)%w.period+w.period)%w.period;let V,Z=!0,te=!0;H<w.oneWay?V=$t(H/w.oneWay):H<w.oneWay+w.pause?(V=1,te=!1):H<2*w.oneWay+w.pause?(V=1-$t((H-w.oneWay-w.pause)/w.oneWay),Z=!1):(V=0,te=!1,Z=!0),qt(L,V,mt);const se=.7/L.total;qt(L,Te(V+(Z?se:-se),0,1),Ct);let le=Ct[0]-mt[0],ie=Ct[1]-mt[1];if(Math.hypot(le,ie)>1e-4){let Re=Math.atan2(-ie,le)-w.yaw;Re=Math.atan2(Math.sin(Re),Math.cos(Re)),w.yaw+=Re*(1-Math.exp(-14*o))}const ue=w.vis;L.drawn&&st(L)&&te&&p++;const ye=v*Math.max(1e-4,Math.min(1,ue*1.4))*(.85+.15*Math.min(1,ue));we.setFromAxisAngle(Pe,w.yaw),me.setScalar(ye),F.set(mt[0],De+.06,mt[1]),fe.compose(F,we,me),N.setMatrixAt(I,fe),me.setScalar(Z&&V<.999&&te||Z&&!te&&V===0?ye:1e-4),fe.compose(F,we,me),B.setMatrixAt(I,fe),me.set(3*v*ue,1,3*v*ue),F.y=De+.07,fe.compose(F,we,me),J.setMatrixAt(I,fe)}),N.instanceMatrix.needsUpdate=!0,B.instanceMatrix.needsUpdate=!0,J.instanceMatrix.needsUpdate=!0}const h=n.pointer.inside&&!n.pointer.touch&&g?n.pointer.nx:0,S=n.pointer.inside&&!n.pointer.touch&&g?n.pointer.ny:0;n.parallax.x=Ce(n.parallax.x,h,2.2,o),n.parallax.y=Ce(n.parallax.y,S,2.2,o);const A=g&&i==="routes"?Math.sin(l*.11)*.025:0,M=i==="routes"?1:.6;if(Ie(Se.polar-n.parallax.y*.05*M,Se.az+n.parallax.x*.085*M+A,re),n.statsT+=o,a.onStats&&n.statsT>.25){n.statsT=0;const v={routes:z,km:Math.round(x),trucksActive:p},w=`${v.routes}|${v.km}|${v.trucksActive}`;if(w!==n.statsKey){n.statsKey=w;try{a.onStats(v)}catch(I){console.warn(I)}}}}const hn=new ce(oe.brand),Ye=new ce("#142233"),Vt=new ce(oe.cyan),Zn=new ce("#dff1ff");function ht(o){mn(o),k.updateMatrixWorld(),n.pointer.dirty?at():n.hoverRoute&&zt(),c.render(m,k),Et()}function Zt(o){if(n.raf=0,n.destroyed||!n.visible||!n.tabVisible)return;const l=Math.min(.05,n.last?(o-n.last)/1e3:.016);n.last=o,ht(l),n.raf=requestAnimationFrame(Zt)}function Xt(){!n.raf&&n.ready&&n.visible&&n.tabVisible&&!n.destroyed&&(n.last=0,n.raf=requestAnimationFrame(Zt))}function vt(){n.raf&&cancelAnimationFrame(n.raf),n.raf=0}function Xn(){if(!(n.introDone||n.introT>=0)){if(!g||a.intro===!1){for(const o of O.values())o.grow=1;for(const o of $)o.drawn=!0,o.mat.uniforms.uDraw.value=1;n.introDone=!0;return}n.deptIntroT=0;for(const o of O.values())o.grow=.02;i==="routes"?Tt():n.introDone=!0}}const Qt=new IntersectionObserver(o=>{for(const l of o)n.visible=l.isIntersecting,n.visible?(n.ready&&!n._introStarted&&(n._introStarted=!0,Xn()),Xt()):vt()},{threshold:.12}),Yt=()=>{n.tabVisible=!document.hidden,n.tabVisible?Xt():vt()};document.addEventListener("visibilitychange",Yt);const Kt=new ResizeObserver(()=>dt()),Jt=Promise.all([fetch(a.geoUrl).then(o=>{if(!o.ok)throw new Error("GeoJSON "+o.status);return o.json()}),fetch(a.routesUrl).then(o=>{if(!o.ok)throw new Error("rutas "+o.status);return o.json()})]).then(([o,l])=>{if(n.destroyed)return Ke;if(Fn(o,l),g&&a.intro!==!1){for(const x of O.values())x.grow=.02;Q.group&&Q.group.scale.setScalar(i==="routes"?.001:1)}else{n.introDone=!0;for(const x of $)x.drawn=!0,x.mat.uniforms.uDraw.value=1}return n.ready=!0,dt(),Kt.observe(t),Qt.observe(t),n.pending.splice(0).forEach(x=>x()),typeof a.onReady=="function"&&a.onReady(Ke),Ke}).catch(o=>{throw console.warn("[sv-map]",o),o});Jt.catch(()=>{});function Qn(){var o,l;if(!n.destroyed){n.destroyed=!0,vt(),Qt.disconnect(),Kt.disconnect(),document.removeEventListener("visibilitychange",Yt),We.removeEventListener("pointermove",Ht),We.removeEventListener("pointerleave",Nt),We.removeEventListener("pointerdown",Qe),We.removeEventListener("pointerup",Gt);for(const r of q)(o=r.dispose)==null||o.call(r);N&&N.dispose(),B&&B.dispose(),J&&J.dispose(),C.dispose(),T.dispose(),c.dispose(),(l=c.forceContextLoss)==null||l.call(c),u.remove()}}const Ke={ready:Jt,destroy:Qn,resize:()=>dt(),focusZone:pn,playIntro:Tt,select:(o,l=!1)=>rt(o,l),get selected(){return n.selected},get mode(){return i},get state(){return{ready:n.ready,visible:n.visible,tabVisible:n.tabVisible,running:!!n.raf,introDone:n.introDone,focus:n.focus}}};return Ke}const qe={zone:{A:"#4fc79a",B:"#5fb0e8",C:"#11679f",D:"#4a5058"},idle:"#c9ccd0",brand:"#2463d0",pulse:"#a9d4ff",ink:"#0b1118"},Ha=3.4,Na=.06,ei=.05,ti={A:0,B:1,C:2,D:3},Ga={chassis:"#3a4048",cab:"#ffffff",glass:"#9cc3e6",roof:"#f3f5f7",bedFloor:"#1b4aa0",bedSide:"#2463d0",bedBack:"#1d55bb",bedFront:"#2d6fe2",wheel:"#1a1d21",load:"#9ea3a8"},ja=`
uniform float uTime; uniform float uDraw; uniform float uOpacity; uniform float uHl; uniform float uMotion; uniform float uLen; uniform float uPhase; uniform float uCasing;
uniform vec3 uCol; uniform vec3 uPulse;
varying float vT; varying float vSide; varying float vD;
void main(){
  if (vT > uDraw) discard;
  float s = abs(vSide);
  float aa = max(fwidth(vSide) * 1.5, 0.03);
  float head = uDraw < 0.999 ? smoothstep(0.0, 0.7, (uDraw - vT) * uLen) : 1.0;
  if (uCasing > 0.5) {
    float a = 1.0 - smoothstep(1.0 - aa, 1.0, s);
    gl_FragColor = vec4(1.0, 1.0, 1.0, a * uOpacity * head);
  } else {
    float cr = mix(0.5, 0.64, uHl);
    float a = 1.0 - smoothstep(cr - aa, cr, s);
    float p = fract(vD / 6.5 - uTime * 0.32 + uPhase);
    float pulse = smoothstep(0.45, 0.97, p) * (1.0 - smoothstep(0.97, 1.0, p)) * uMotion;
    vec3 col = mix(uCol, uPulse, pulse * 0.85);
    gl_FragColor = vec4(col, a * uOpacity * head);
  }
  #include <colorspace_fragment>
}`,qa=`
uniform float uTime; uniform float uSpeed; uniform float uPhase; uniform vec3 uCol; uniform float uOpacity;
varying vec2 vUv;
void main(){
  float d = length(vUv - 0.5) * 2.0;
  float a = 0.0;
  for (int i = 0; i < 2; i++) {
    float r = fract(uTime * uSpeed + uPhase + float(i) * 0.5);
    a += (1.0 - smoothstep(0.0, 0.045, abs(d - r))) * pow(1.0 - r, 1.3) * 0.85;
    a += (1.0 - smoothstep(0.0, r, d)) * pow(1.0 - r, 2.0) * 0.12;
  }
  a *= 1.0 - smoothstep(0.94, 1.0, d);
  gl_FragColor = vec4(uCol, a * uOpacity);
  #include <colorspace_fragment>
}`,ni=`
uniform float uOpacity; uniform vec3 uCol; varying vec2 vUv;
void main(){ float d = length((vUv - 0.5) * 2.0); float a = 1.0 - smoothstep(0.1, 1.0, d); gl_FragColor = vec4(uCol, a * a * uOpacity);
  #include <colorspace_fragment>
}`,oi="svm-styles-light-v1";function Va(){if(document.getElementById(oi))return;const t=document.createElement("style");t.id=oi;const e=qe.zone;t.textContent=`
.svm-light{color:#0b1118}
.svm-light .svm-dept{font:700 9px/1 ${be};letter-spacing:.16em;text-transform:uppercase;color:rgba(16,27,39,.58);text-shadow:0 1px 0 rgba(255,255,255,.45)}
.svm-light .svm-dept.svm-ondark{color:rgba(255,255,255,.82);text-shadow:0 1px 2px rgba(0,0,0,.25)}
.svm-light .svm-dept.svm-strong{color:#0b1118}
.svm-light .svm-dept.svm-ondark.svm-strong{color:#fff}
.svm-light .svm-ldest{font:600 11.5px/1 ${be};color:#0b1118;background:rgba(255,255,255,.96);padding:5px 8px;border-radius:7px;box-shadow:0 6px 18px rgba(16,27,39,.16),0 1px 2px rgba(16,27,39,.08)}
.svm-light .svm-lq{display:flex;align-items:center;gap:9px;padding:7px 13px 7px 8px;border-radius:999px;background:#fff;box-shadow:0 12px 32px rgba(16,27,39,.18),0 1px 3px rgba(16,27,39,.1);font:500 12px/1 ${be};color:rgba(16,27,39,.6)}
.svm-light .svm-lq b{font:700 13px/1 ${vo};color:#0b1118;letter-spacing:.005em}
.svm-light .svm-lq i{width:10px;height:10px;border-radius:50%;background:${qe.brand};box-shadow:0 0 0 3px rgba(36,99,208,.18);flex:none}
.svm-light .svm-lanchor{display:flex;align-items:center;gap:7px;padding:5px 9px 5px 5px;border-radius:8px;background:#fff;box-shadow:0 8px 22px rgba(16,27,39,.16),0 1px 2px rgba(16,27,39,.08);font:600 11.5px/1 ${be};color:#0b1118}
.svm-light .svm-lanchor em{font-style:normal;font:700 8.5px/1 ${be};letter-spacing:.14em;text-transform:uppercase;color:#fff;background:${qe.brand};padding:4px 6px;border-radius:5px}
.svm-lcard{min-width:236px;max-width:280px;padding:15px 16px 14px;border-radius:14px;background:#fff;color:#0b1118;border:1px solid rgba(16,27,39,.06);box-shadow:0 20px 48px rgba(16,27,39,.18),0 2px 6px rgba(16,27,39,.08)}
.svm-lcard .svm-k{color:rgba(16,27,39,.5);white-space:nowrap}
.svm-lcard .svm-row{flex-wrap:wrap;white-space:nowrap;row-gap:6px}
.svm-lcard .svm-t{color:#0b1118}
.svm-lcard .svm-sub{color:${qe.brand}}
.svm-lcard .svm-grid{border-top-color:rgba(16,27,39,.08)}
.svm-lcard .svm-grid span{color:rgba(16,27,39,.48)}
.svm-lcard .svm-grid b{color:#0b1118}
.svm-lcard .svm-grid b.svm-blue{color:${qe.brand}}
.svm-lcard .svm-row{color:rgba(16,27,39,.62)}
.svm-lcard .svm-mono{color:#0b1118}
.svm-lcard .svm-row .svm-blue{color:${qe.brand};font-family:${An};font-size:12px;font-weight:600}
.svm-lcard.svm-ltip{min-width:220px;max-width:300px;padding:11px 13px 11px}
.svm-lcard.svm-ltip .svm-t{font-size:15px;margin-top:6px}
.svm-lchip{display:inline-flex;align-items:center;white-space:nowrap;flex:none;font:700 9px/1 ${be};letter-spacing:.12em;text-transform:uppercase;padding:4px 7px;border-radius:5px;color:#fff;background:${qe.brand}}
.svm-lchip.z-A{background:${e.A};color:#05301f}.svm-lchip.z-B{background:${e.B};color:#062a44}.svm-lchip.z-C{background:${e.C}}.svm-lchip.z-D{background:${e.D}}.svm-lchip.z-none{background:${qe.idle};color:#1b2a3a}
.svm-lpin{display:inline-flex;align-items:center;gap:6px;font:600 9.5px/1 ${be};letter-spacing:.14em;text-transform:uppercase;color:${qe.brand}}
@media (max-width:640px){.svm-lcard{min-width:206px;padding:12px 13px}.svm-light .svm-lq{font-size:11px;padding:5px 10px 5px 7px;gap:7px}.svm-light .svm-lq b{font-size:11.5px}.svm-light .svm-lq span{display:none}.svm-light .svm-lanchor{font-size:10px;padding:4px 7px 4px 4px;gap:5px}.svm-light .svm-lanchor em{font-size:7.5px;padding:3px 4px}.svm-light .svm-dept{font-size:8px;letter-spacing:.12em}}
`,document.head.appendChild(t)}function ao(t,{fill:e,dot:a,ring:i,logo:s}){const d=t.width,g=t.height,u=t.getContext("2d");u.clearRect(0,0,d,g);const b=d/2,y=d*.32,c=y+d*.12,f=g*.93,m=()=>{u.beginPath(),u.moveTo(b,f),u.bezierCurveTo(b-y*.3,f-(f-c)*.42,b-y,c+y*.62,b-y,c),u.arc(b,c,y,Math.PI,0),u.bezierCurveTo(b+y,c+y*.62,b+y*.3,f-(f-c)*.42,b,f),u.closePath()};if(u.save(),u.shadowColor="rgba(16,27,39,0.34)",u.shadowBlur=d*.09,u.shadowOffsetY=d*.035,m(),u.fillStyle=e,u.fill(),u.restore(),m(),u.lineWidth=Math.max(1.5,d*.014),u.strokeStyle="rgba(16,27,39,0.10)",u.stroke(),i&&(u.beginPath(),u.arc(b,c,y*.72,0,Math.PI*2),u.fillStyle=i,u.fill()),s){const T=y*1.02,C=s.naturalWidth/s.naturalHeight||1;u.drawImage(s,b-T*C/2,c-T/2,T*C,T)}else a&&(u.beginPath(),u.arc(b,c,y*(i?.5:.4),0,Math.PI*2),u.fillStyle=a,u.fill());return 1-f/g}function Za(t,e,a){const d=(e.maxX-e.minX)*1.28,g=(e.maxZ-e.minZ)*(1+.14*2)+8,u=Math.max(64,Math.round(512*g/d)),b=e.minX-(e.maxX-e.minX)*.14,y=e.minZ-(e.maxZ-e.minZ)*.14-4,c=document.createElement("canvas");c.width=512,c.height=u;const f=c.getContext("2d");f.fillStyle="#000";for(const U of t)f.beginPath(),U.forEach((P,_)=>{const n=(P[0]-b)/d*512,O=(P[1]-y)/g*u;_?f.lineTo(n,O):f.moveTo(n,O)}),f.closePath(),f.fill();const m=document.createElement("canvas");m.width=512,m.height=u;const T=m.getContext("2d"),C=a*512,k=[.25,.55,.85,1.15],E=14;T.globalAlpha=.07;for(const U of k)for(let P=0;P<E;P++){const _=P/E*Math.PI*2+U;T.drawImage(c,Math.cos(_)*C*U,Math.sin(_)*C*U)}const R=new lo(m);return R.colorSpace=ln,{tex:R,cx:b+d/2,cz:y+g/2,w:d,h:g}}function Xa(t,e){var en,tn;const a=((en=window.matchMedia)==null?void 0:en.call(window,"(prefers-reduced-motion: reduce)").matches)??!1,i=((tn=window.matchMedia)==null?void 0:tn.call(window,"(max-width: 760px), (pointer: coarse)").matches)??!1,s=!a,d=qe,g=Ha,u=Na,b=g+u;if(Di(),Va(),!Oi())return Ii(t,e,"routes");getComputedStyle(t).position==="static"&&(t.style.position="relative");const y=document.createElement("div");y.className="svm-root svm-light svm-mode-routes";const c=document.createElement("div");c.className="svm-layer";const f=document.createElement("div");f.className="svm-pop",c.appendChild(f);const m=new si({antialias:!0,alpha:!0,powerPreference:"high-performance"});m.setClearColor(16777215,0),m.outputColorSpace=ln,m.toneMapping=Gi;const T=1.5;m.setPixelRatio(Math.min(window.devicePixelRatio||1,T)),y.appendChild(m.domElement),y.appendChild(c),t.appendChild(y),m.domElement.setAttribute("role","img"),m.domElement.setAttribute("aria-label","Mapa 3D de El Salvador con las rutas de entrega de Cantera JOB desde Ciudad Arce");const C=new bo,k=new li(m),E=k.fromScene(new yi,.04).texture;C.environment=E;const R=new ci(22,1,1,3e3);C.add(new ui(16777215,14278373,.92));const U=new Tn(16777215,1.14);U.position.set(-30,90,40),C.add(U);const P=new ct;C.add(P);const _={uTime:{value:0},uMotion:{value:s?1:0}},n={ready:!1,destroyed:!1,visible:!1,tabVisible:!document.hidden,raf:0,last:0,time:0,introDone:!1,introT:-1,deptIntroT:-1,introStarted:!1,focus:null,hoverDept:null,hoverRoute:null,pinned:null,featured:null,featIdx:-1,featT:0,selected:null,pointer:{x:0,y:0,nx:0,ny:0,inside:!1,dirty:!1,touch:!1},parallax:{x:0,y:0},size:{w:1,h:1},statsKey:"",statsT:0,pending:[],popKey:""},O=new Map,$=[],W=[],G=[],N=[],B={};let J=null,Q=null,q=null,D=null,X=null,Y=[0,0];const ge=new pi,F=new ne,fe=new wo,we=new mi,me=new ne,Pe=new ne(0,1,0),_e=(o,l)=>{const r=X([o,l]);return[r[0]-Y[0],r[1]-Y[1]]},He=i?4.4:2.7,St=i?7.6:5.4;function Bn(o){const l=new Fe({color:o,roughness:.42,metalness:0,envMapIntensity:.4}),r={value:0};return l.userData={uHl:r},l.onBeforeCompile=x=>{x.uniforms.uHl=r,x.fragmentShader=x.fragmentShader.replace("#include <common>",`#include <common>
uniform float uHl;`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
totalEmissiveRadiance += vec3(1.0) * uHl * 0.07;`)},l.customProgramCacheKey=()=>"svm-lcap",l}function Wn(o){const l=new ce(o),r={};l.getHSL(r),l.setHSL(r.h,Math.min(1,r.s*1.05),r.l*.68);const x=new Rt({color:l});return x.onBeforeCompile=z=>{z.vertexShader=z.vertexShader.replace("#include <common>",`#include <common>
varying float vLy;`).replace("#include <project_vertex>",`#include <project_vertex>
vLy = position.y;`),z.fragmentShader=z.fragmentShader.replace("#include <common>",`#include <common>
varying float vLy;`).replace("#include <color_fragment>",`#include <color_fragment>
diffuseColor.rgb *= mix(0.74, 1.04, smoothstep(${(-u).toFixed(3)}, ${b.toFixed(3)}, vLy));`)},x.customProgramCacheKey=()=>"svm-lside",x}function Fn(o,l){var w;const r=[];for(const I of o.features)for(const L of I.geometry.type==="Polygon"?[I.geometry.coordinates]:I.geometry.coordinates)r.push(...L[0]);X=To().fitWidth(Ci,{type:"MultiPoint",coordinates:r});let x=1e9,z=-1e9,p=1e9,h=-1e9;for(const I of r){const L=X(I);x=Math.min(x,L[0]),z=Math.max(z,L[0]),p=Math.min(p,L[1]),h=Math.max(h,L[1])}Y=[(x+z)/2,(p+h)/2],D={minX:x-Y[0],maxX:z-Y[0],minZ:p-Y[1],maxZ:h-Y[1]};const S=_e(l.origin.lon,l.origin.lat),A=new Map;for(const I of l.routes){const L=A.get(I.department);!L||ti[I.zone]<ti[L.zone]?A.set(I.department,{zone:I.zone,count:((L==null?void 0:L.count)||0)+1}):L.count++}A.has("la-libertad")?A.get("la-libertad").zone="A":A.set("la-libertad",{zone:"A",count:0});const M=[];for(const I of o.features){const L=I.properties.id,j=I.properties.name||((w=Ae[L])==null?void 0:w.name)||L,H=A.get(L)||null,V=H?d.zone[H.zone]:d.idle,Z=Bn(V),te=Wn(V),se=new Un({color:16777215,linewidth:i?1:1.35,transparent:!0,opacity:.92,depthWrite:!1}),le=new ct,ie=[];let ue=0,ye=[0,0];for(const Dt of I.geometry.type==="Polygon"?[I.geometry.coordinates]:I.geometry.coordinates){const Je=Ai(Dt[0].map(de=>_e(de[0],de[1])));if(Je.length<3)continue;M.push(Je);const et=Math.abs(Co(Je)),At=et<3,gt=On(Je.map(de=>[de[0],-de[1]]),At?ei*.4:ei),Yn=new fi(gt.map(de=>new It(de[0],de[1]))),lt=new di(Yn,At?{depth:g,bevelEnabled:!1,curveSegments:1}:{depth:g,bevelEnabled:!0,bevelThickness:u,bevelSize:u,bevelOffset:-u,bevelSegments:1,curveSegments:1});lt.rotateX(-Math.PI/2),N.push(lt);const tt=new ee(lt,[Z,te]);tt.userData.id=L,le.add(tt),ie.push(tt);const nn=At?gt:On(gt,u),Kn=(At?g:b)+.03,on=[];for(const de of nn.concat([nn[0]]))on.push(de[0],Kn,-de[1]);const yt=new So;yt.setPositions(on),N.push(yt);const Lt=new gi(yt,se);Lt.renderOrder=1,le.add(Lt),et>ue&&(ue=et,ye=Li(Je))}const Ne={"la-libertad":[.6,3.2],"san-salvador":[.6,.6],"la-union":[-1.2,-.6],usulutan:[.5,-1.4],"la-paz":[.2,1.2],"santa-ana":[.6,-1.4],sonsonate:[-.6,.4]};Ne[L]&&(ye[0]+=Ne[L][0],ye[1]+=Ne[L][1]),P.add(le),N.push(Z,te,se);const Re=H?H.zone==="C"||H.zone==="D":!1;O.set(L,{id:L,name:j,group:le,capMat:Z,sideMat:te,edgeMat:se,meshes:ie,lift:0,grow:1,labelPt:ye,served:H}),e.labels!==!1&&!i&&ut({kind:"dept",id:L,cls:"svm-dept"+(Re?" svm-ondark":""),html:j,pos:new ne(ye[0],b+.1,ye[1]),prio:20})}[...O.values()].sort((I,L)=>Math.hypot(I.labelPt[0]-S[0],I.labelPt[1]-S[1])-Math.hypot(L.labelPt[0]-S[0],L.labelPt[1]-S[1])).forEach((I,L)=>{I.growDelay=L*.05});for(const[I,L,j]of[[.03,.26,2.6],[.008,.42,.6]]){const H=Za(M,D,I),V=new Rt({map:H.tex,color:"#1a2633",transparent:!0,opacity:L,depthWrite:!1}),Z=new ee(new ot(H.w,H.h),V);Z.rotation.x=-Math.PI/2,Z.position.set(H.cx,-u-.03,H.cz+j),Z.renderOrder=-2,P.add(Z),N.push(Z.geometry,V,H.tex)}Nn(S),Gn(l),s&&jn()}function Hn(o,l,r,x,z=0){const p=new ee(new ot(o,o),new $e({vertexShader:Ot,fragmentShader:qa,transparent:!0,depthWrite:!1,depthTest:!1,uniforms:{uTime:_.uTime,uSpeed:{value:x},uPhase:{value:z},uCol:{value:new ce(l)},uOpacity:{value:r}}}));return p.rotation.x=-Math.PI/2,N.push(p.geometry,p.material),p}const Mt=new ot(1,1);Mt.rotateX(-Math.PI/2),N.push(Mt);const Ft=new $e({vertexShader:Ot,fragmentShader:ni,transparent:!0,depthWrite:!1,depthTest:!1,uniforms:{uOpacity:{value:.32},uCol:{value:new ce("#0e1a26")}}});N.push(Ft);function Nn(o){const l=new ct;l.position.set(o[0],b,o[1]);const r=Hn(i?14:10,d.brand,s?.55:.3,s?.35:0);r.position.y=.06,r.renderOrder=3,l.add(r);const x=new Qi(i?1.6:1.05,40);x.rotateX(-Math.PI/2);const z=new ee(x,new Rt({color:d.brand,depthTest:!1,transparent:!0})),p=new Yi(i?1.6:1.05,i?2.1:1.38,40);p.rotateX(-Math.PI/2);const h=new ee(p,new Rt({color:16777215,depthTest:!1,transparent:!0}));z.position.y=h.position.y=.08,z.renderOrder=h.renderOrder=5,l.add(h,z);const S=document.createElement("canvas");S.width=192,S.height=240;const A=ao(S,{fill:d.brand,ring:"#ffffff",dot:d.brand}),M=new lo(S);M.colorSpace=ln,M.anisotropy=4;const v=new Do({map:M,transparent:!0,depthWrite:!1}),w=new Ao(v);w.center.set(.5,A);const I=new It(St*S.width/S.height,St);w.scale.set(I.x,I.y,1),w.position.y=.1,w.renderOrder=9,l.add(w);const L=new Image;L.onload=()=>{n.destroyed||(ao(S,{fill:d.brand,ring:"#ffffff",logo:L}),M.needsUpdate=!0,n.ready&&ht(0))},L.src=new URL("assets/brand/logo-color-iso.png",document.baseURI).href,N.push(x,p,z.material,h.material,M,v),P.add(l),Object.assign(B,{group:l,pin:w,pinBase:I,pos:o}),ut({kind:"quarry",cls:"",html:'<div class="svm-lq"><i></i><b>Cantera JOB</b><span>· Ciudad Arce</span></div>',pos:new ne(o[0],b+St*1.02,o[1]),prio:1e3,anchor:"top"})}function Gn(o){const l=document.createElement("canvas");l.width=128,l.height=160;const r=ao(l,{fill:"#ffffff",dot:d.brand}),x=new lo(l);x.colorSpace=ln,x.anisotropy=4,N.push(x);const z=i?1.3:.76;[...o.routes].sort((h,S)=>h.km-S.km).forEach((h,S)=>{const A=h.coordinates.map(Re=>_e(Re[0],Re[1])),{geometry:M,cum:v,total:w}=Pi(A,z),I={uTime:_.uTime,uMotion:_.uMotion,uDraw:{value:s?0:1},uOpacity:{value:1},uHl:{value:0},uLen:{value:w},uPhase:{value:S*.173%1},uCol:{value:new ce(d.brand)},uPulse:{value:new ce(d.pulse)}},L=Re=>new $e({vertexShader:ki,fragmentShader:ja,transparent:!0,depthWrite:!1,depthTest:!1,side:so,uniforms:{...I,uCasing:{value:Re}}}),j=new ee(M,L(1)),H=new ee(M,L(0));j.position.y=H.position.y=b+.05,j.renderOrder=3,H.renderOrder=4,P.add(j,H),N.push(M,j.material,H.material);const V=A[A.length-1],Z=new ct;Z.position.set(V[0],b,V[1]);const te=new Do({map:x,transparent:!0,depthWrite:!1}),se=new Ao(te);se.center.set(.5,r),se.renderOrder=9;const le=He*(h.anchor?1.25:1),ie=new It(le*l.width/l.height,le);se.scale.set(1e-4,1e-4,1),se.position.y=.06;const ue=new ee(Mt,Ft);ue.scale.set(ie.x*.9,1,ie.x*.5),ue.position.y=.07,ue.renderOrder=5,Z.add(ue,se),P.add(Z),N.push(te),Math.hypot(V[0]-B.pos[0],V[1]-B.pos[1])<(i?3.2:2.4)&&(Z.visible=!1);const Ne={data:h,casing:j,core:H,U:I,pts:A,cum:v,total:w,pg:Z,pin:se,pinMat:te,blob:ue,pinBase:ie,pinH:le,startAt:.75+S*.1,drawDur:.45+.85*Math.sqrt(w/70),drawn:!s,popT:s?-1:-10,opacity:1,hl:0};$.push(Ne),Ne.label=ut({kind:"dest",route:Ne,cls:h.anchor?"":"svm-ldest",html:h.anchor?'<div class="svm-lanchor"><em>Cliente ancla</em>Condado Quetzal</div>':h.name,pos:new ne(V[0],b+le*.66,V[1]),prio:h.anchor?500:10,anchor:"right"})})}function jn(){const o=e.trucks??(i?14:36),l=$.slice(),r=$.find(v=>v.data.anchor);r&&l.push(r,r);const x=[...$].sort((v,w)=>w.total-v.total).slice(0,10);let z=0;for(;l.length<o;)l.push(x[z++%x.length]);l.length=Math.min(l.length,o);const p=_i(Ga);N.push(p.body,p.load);const h=new Fe({vertexColors:!0,roughness:.5,metalness:.05,envMapIntensity:.6}),S=new Fe({vertexColors:!0,roughness:.95,metalness:0}),A=l.length+1;J=new Ut(p.body,h,A),Q=new Ut(p.load,S,A),q=new Ut(Mt,new $e({vertexShader:Ri,fragmentShader:ni,transparent:!0,depthWrite:!1,depthTest:!1,uniforms:{uOpacity:{value:.34},uCol:{value:new ce("#0e1a26")}}}),A);for(const v of[J,Q,q])v.frustumCulled=!1;q.renderOrder=5,J.renderOrder=6,Q.renderOrder=6,N.push(h,S,q.material),P.add(q,J,Q);const M=new Map;l.forEach((v,w)=>{const I=M.get(v)||0;M.set(v,I+1);const L=Te(v.total/4.4,3.4,16),j=1.2,H=2*L+2*j;G.push({r:v,oneWay:L,pause:j,period:H,offset:(I*.41+w*.618%1)*H,vis:0,yaw:0})}),G.push({r:null,special:!0,t0:0,oneWay:1,pause:1.2,period:1,offset:0,vis:0,yaw:0})}function ut(o){const l=document.createElement("div");l.className="svm-lbl "+(o.cls||""),l.innerHTML=o.html,c.insertBefore(l,f);const r={...o,el:l,w:0,h:0,x:-1e4,y:-1e4,on:!1};return W.push(r),r}const Et=()=>n.hoverRoute||n.pinned;function Se(){var p;const{w:o,h:l}=n.size,r=[],x=Et(),z=h=>h.prio+(h.route&&h.route===x?3e3:0)+(h.route&&h.route===n.featured?400:0)+(n.focus&&h.route&&h.route.data.zone===n.focus?100:0);for(const h of W.slice().sort((S,A)=>z(A)-z(S))){h.w||(h.w=h.el.offsetWidth,h.h=h.el.offsetHeight);let S=n.introDone||!s||h.kind!=="dest";if(h.kind==="dept"&&O.get(h.id).grow<.7&&(S=!1),h.kind==="quarry"&&B.group&&B.group.scale.x<.5&&(S=!1),h.kind==="dest"){const w=h.route;(!w.drawn||w.opacity<.5)&&(S=!1),w===x||w===n.featured||n.focus&&w.data.zone===n.focus||w.data.anchor||(S=!1)}if(F.copy(h.pos),h.kind==="dept"){const w=O.get(h.id);F.y=b*w.grow+w.lift+.1}h.kind==="dest"&&(O.get(h.route.data.department),F.y=h.pos.y),F.project(R);let A=(F.x*.5+.5)*o,M=(-F.y*.5+.5)*l;h.anchor==="left"?(A-=h.w+16,M-=h.h/2):h.anchor==="top"?(A-=h.w/2,M-=h.h+6):h.anchor==="right"&&(A+=12,M-=h.h/2),h.kind==="quarry"||(p=h.route)!=null&&p.data.anchor?(A=Te(A,4,o-h.w-4),M=Te(M,4,l-h.h-4)):(A-=h.w/2,M-=h.h/2);const v=[A-3,M-3,A+h.w+3,M+h.h+3];if(S&&F.z<1){for(const w of r)if(v[0]<w[2]&&v[2]>w[0]&&v[1]<w[3]&&v[3]>w[1]){S=!1;break}(v[0]<0||v[2]>o||v[1]<0||v[3]>l)&&(S=h.kind==="quarry")}else S=!1;S&&r.push(v),(Math.abs(A-h.x)>.25||Math.abs(M-h.y)>.25)&&(h.x=A,h.y=M,h.el.style.transform=`translate3d(${A.toFixed(1)}px,${M.toFixed(1)}px,0)`),S!==h.on&&(h.on=S,h.el.classList.toggle("svm-on",S))}}const re={polar:0,az:0,margin:.02};let ke=160;const Ie=new ne;function ft(o,l,r){R.position.set(Ie.x+r*Math.sin(o)*Math.sin(l),Ie.y+r*Math.cos(o),Ie.z+r*Math.sin(o)*Math.cos(l)),R.lookAt(Ie)}function qn(){if(!D)return;const o=R.aspect,l=Ve.degToRad;o>=1.6?(re.polar=l(53),re.az=l(-9)):o>=1.1?(re.polar=l(47),re.az=l(-13)):(re.polar=l(42),re.az=l(-20)),re.margin=o>=1.6?.015:.025,Ie.set((D.minX+D.maxX)/2,0,(D.minZ+D.maxZ)/2);const r=[];for(const S of O.values())for(const A of S.meshes){const M=A.geometry.attributes.position.array;for(let v=0;v<M.length;v+=3*29)r.push(new ne(M[v],M[v+1]>.5?b:-u,M[v+2]))}B.pos&&r.push(new ne(B.pos[0],b+St,B.pos[1]));const x=1-re.margin*2,z=new ne,p=new ne,h=()=>{let S=9,A=-9,M=9,v=-9;for(const w of r)F.copy(w).project(R),S=Math.min(S,F.x),A=Math.max(A,F.x),M=Math.min(M,F.y),v=Math.max(v,F.y);return[S,A,M,v]};for(let S=0;S<3;S++){let A=10,M=2e3;for(let H=0;H<36;H++){const V=(A+M)/2;ft(re.polar,re.az,V),R.updateMatrixWorld();const Z=h();(Z[1]-Z[0])/2<=x&&(Z[3]-Z[2])/2<=x?M=V:A=V}ke=M,ft(re.polar,re.az,ke),R.updateMatrixWorld();const v=h(),w=(v[0]+v[1])/2,I=(v[2]+v[3])/2,L=Math.tan(Ve.degToRad(R.fov/2))*ke,j=L*R.aspect;z.setFromMatrixColumn(R.matrixWorld,0),z.y=0,z.normalize(),p.set(-Math.sin(re.az),0,-Math.cos(re.az)),Ie.addScaledVector(z,w*j),Ie.addScaledVector(p,I*L/Math.cos(re.polar))}ft(re.polar,re.az,ke)}function dt(){const o=Math.max(1,t.clientWidth),l=Math.max(1,t.clientHeight);n.size={w:o,h:l},m.setPixelRatio(Math.min(window.devicePixelRatio||1,T)),m.setSize(o,l,!1),R.aspect=o/l,R.updateProjectionMatrix();for(const r of O.values())r.edgeMat.resolution.set(o,l);qn();for(const r of W)r.w=0;n.ready&&ht(0)}const Ue=m.domElement;function Ht(o){const l=Ue.getBoundingClientRect();n.pointer.x=o.clientX-l.left,n.pointer.y=o.clientY-l.top,n.pointer.nx=n.pointer.x/l.width*2-1,n.pointer.ny=-(n.pointer.y/l.height)*2+1,n.pointer.inside=!0,n.pointer.dirty=!0}const Nt=o=>{n.pointer.touch=o.pointerType==="touch",n.pointer.touch||Ht(o)},Xe=()=>{n.pointer.inside=!1,n.pointer.dirty=!0};let Qe=null;const Gt=o=>{Qe={x:o.clientX,y:o.clientY,t:performance.now()}},We=o=>{if(!Qe)return;const l=Math.hypot(o.clientX-Qe.x,o.clientY-Qe.y),r=performance.now()-Qe.t;Qe=null,!(l>10||r>600)&&(Ht(o),n.pointer.touch=o.pointerType==="touch",jt(!0))};Ue.addEventListener("pointermove",Nt),Ue.addEventListener("pointerleave",Xe),Ue.addEventListener("pointerdown",Gt),Ue.addEventListener("pointerup",We);function pt(o,l,r){return F.set(o,l,r).project(R),[(F.x*.5+.5)*n.size.w,(-F.y*.5+.5)*n.size.h]}function Vn(o,l,r,x){const z=x[0]-r[0],p=x[1]-r[1],h=z*z+p*p||1,S=Te(((o-r[0])*z+(l-r[1])*p)/h,0,1);return Math.hypot(o-r[0]-S*z,l-r[1]-S*p)}const at=o=>!n.focus||o.data.zone===n.focus;function jt(o=!1){n.pointer.dirty=!1;let l=null,r=null;if(n.pointer.inside){const{x,y:z}=n.pointer;let p=o?26:16;for(const h of $){if(!h.drawn||!at(h))continue;const S=h.pts[h.pts.length-1];for(const A of[h.pinH*.62,.3]){const M=pt(S[0],b+A,S[1]),v=Math.hypot(M[0]-x,M[1]-z);v<p&&(p=v,l=h)}}if(!l){let h=o?14:7;for(const S of $){if(!S.drawn||!at(S))continue;let A=null;for(const M of S.pts){const v=pt(M[0],b,M[1]);if(A){const w=Vn(x,z,A,v);w<h&&(h=w,l=S)}A=v}}}if(!l){ge.setFromCamera({x:n.pointer.nx,y:n.pointer.ny},R);const h=[];for(const A of O.values())h.push(...A.meshes);const S=ge.intersectObjects(h,!1)[0];S&&(r=S.object.userData.id)}}if(l!==n.hoverRoute||r!==n.hoverDept){n.hoverRoute=l,n.hoverDept=r,y.classList.toggle("svm-hot",!!(l||r));for(const x of W)x.kind==="dept"&&x.el.classList.toggle("svm-strong",x.id===r);rt()}}function zt(o,l){var x;const r=o.zone;return`<div class="svm-lcard">
      <div class="svm-k"><span class="svm-lchip z-${r}">Zona ${r}</span>${l?"Tu obra · desde Ciudad Arce":"Desde Ciudad Arce"}</div>
      <div class="svm-t">${o.anchor?"Condado Quetzal":o.name}</div>
      ${o.anchor?'<div class="svm-sub">Quezaltepeque · desarrollo propio del grupo</div>':`<div class="svm-sub" style="color:rgba(16,27,39,.5)">${((x=Ae[o.department])==null?void 0:x.name)||""}</div>`}
      <div class="svm-grid">
        <div><span>Distancia</span><b>${o.km.toFixed(1)} km</b></div>
        <div><span>Tiempo</span><b>${o.minutes} min</b></div>
        <div><span>Flete/viaje</span><b class="svm-blue">${go(r)}</b></div>
      </div></div>`}function rt(){const o=Et();let l="",r="";if(n.hoverRoute||n.pinned&&!n.hoverDept)l="r:"+o.data.id+(o===n.pinned&&!n.hoverRoute?":p":""),r=zt(o.data,o===n.pinned&&!n.hoverRoute);else if(n.hoverDept){const x=O.get(n.hoverDept),z=Ae[n.hoverDept]||{},p=x==null?void 0:x.served,h=p==null?void 0:p.zone,S=$.filter(A=>A.data.department===n.hoverDept).length;l="d:"+n.hoverDept,r=`<div class="svm-lcard svm-ltip"><div class="svm-k">Departamento</div><div class="svm-t">${(x==null?void 0:x.name)||""}</div>
        <div class="svm-row">${h?`<span class="svm-lchip z-${h}">Desde zona ${h}</span>`:'<span class="svm-lchip z-none">Bajo cotización</span>'}<span class="svm-mono">~${Math.round(z.km)} km</span><span>a ${z.capital}</span></div>
        <div class="svm-row">${S?`${S} destino${S>1?"s":""} · `:""}Flete <span class="svm-blue">${h&&it[h].flete?`desde $${it[h].flete}`:"a cotizar"}</span></div></div>`}l!==n.popKey&&(n.popKey=l,r&&(f.innerHTML=r)),f.classList.toggle("svm-on",!!r),r&&pn()}function pn(){const{w:o,h:l}=n.size,r=f.offsetWidth,x=f.offsetHeight;let z,p;const h=Et();if(h&&(n.hoverRoute||!n.hoverDept)){const S=h.pts[h.pts.length-1],A=pt(S[0],b+h.pinH*1.05,S[1]);z=A[0]+16,p=A[1]-x-6,z+r>o-8&&(z=A[0]-r-16),p<8&&(p=A[1]+h.pinH*6)}else z=n.pointer.x+16,p=n.pointer.y+18,z+r>o-8&&(z=n.pointer.x-r-16),p+x>l-8&&(p=n.pointer.y-x-14);z=Te(z,6,Math.max(6,o-r-6)),p=Te(p,6,Math.max(6,l-x-6)),f.style.transform=`translate3d(${z.toFixed(1)}px,${p.toFixed(1)}px,0)`}function Tt(o){if(!n.ready){n.pending.push(()=>Tt(o));return}n.focus=o&&it[o]?o:null,n.featured=null}function st(){if(!n.ready){n.pending.push(()=>st());return}if(s){n.introT=0,n.introDone=!1;for(const o of $)o.drawn=!1,o.U.uDraw.value=0,o.popT=-1}}function qt(o){if(!n.ready){n.pending.push(()=>qt(o));return}const l=o?$.find(r=>r.data.id===o):null;if(n.pinned=l||null,l){l.drawn||(l.drawn=!0,l.U.uDraw.value=1,l.popT=n.time),n.focus&&l.data.zone!==n.focus&&(n.focus=null);const r=G.find(x=>x.special);r&&(r.r=l,r.t0=n.time,r.oneWay=Te(l.total/4.4,3.4,16),r.period=2*r.oneWay+2*r.pause,r.vis=0)}n.popKey="",rt(),n.ready&&!n.raf&&ht(0)}function mt(){return $.map(o=>({id:o.data.id,name:o.data.anchor?"Condado Quetzal (Quezaltepeque)":o.data.name,department:o.data.department,zone:o.data.zone,km:o.data.km,minutes:o.data.minutes,flete:Rn(o.data.zone),anchor:!!o.data.anchor})).sort((o,l)=>o.km-l.km)}function Ct(o,l=!1){if(!n.ready){n.pending.push(()=>Ct(o,l));return}if(n.selected=o&&O.has(o)?o:null,l&&n.selected&&typeof e.onSelect=="function"){const r=Ae[o];e.onSelect({id:o,name:O.get(o).name,km_from_quarry_approx:(r==null?void 0:r.km)??null,zone:(r==null?void 0:r.zone)??null,capital:(r==null?void 0:r.capital)??null,flete:Rn(r==null?void 0:r.zone)})}}function mn(o,l,r){const x=l*o.total,z=o.cum;let p=0,h=z.length-1;for(;h-p>1;){const M=p+h>>1;z[M]<=x?p=M:h=M}const S=z[h]-z[p]||1,A=(x-z[p])/S;return r[0]=o.pts[p][0]+(o.pts[h][0]-o.pts[p][0])*A,r[1]=o.pts[p][1]+(o.pts[h][1]-o.pts[p][1])*A,r}const hn=o=>{o=Te(o,0,1);const l=1.9;return 1+(l+1)*Math.pow(o-1,3)+l*Math.pow(o-1,2)},Ye=[0,0],Vt=[0,0];function Zn(o){n.time+=s?o:0,_.uTime.value=n.time;const l=n.time;if(n.deptIntroT>=0){n.deptIntroT+=o;for(const M of O.values())M.grow=.02+.98*yo((n.deptIntroT-M.growDelay)/.9);n.deptIntroT>2&&(n.deptIntroT=-1)}if(n.introT>=0){n.introT+=o;let M=!0;for(const v of $){const w=$t((n.introT-v.startAt)/v.drawDur);v.U.uDraw.value=w,w>=1&&!v.drawn&&(v.drawn=!0,v.popT=l),w<1&&(M=!1)}B.group&&B.group.scale.setScalar(Math.max(.001,hn((n.introT-.35)/.55))),M&&(n.introT=-1,n.introDone=!0,n.featT=0)}if(s&&n.introDone&&!n.hoverRoute&&!n.pinned){if(n.featT-=o,n.featT<=0){const M=$.filter(at);M.length&&(n.featIdx=(n.featIdx+1+Math.floor(M.length/3))%M.length,n.featured=M[n.featIdx]),n.featT=4.2}}else(n.hoverRoute||n.pinned)&&(n.featured=null);for(const M of O.values()){const v=M.id===n.hoverDept&&!n.hoverRoute,w=M.id===n.selected?.7:v?.55:0;M.lift=a?w:Ce(M.lift,w,10,o),M.group.position.y=M.lift,M.group.scale.y=M.grow,M.capMat.userData.uHl.value=Ce(M.capMat.userData.uHl.value,v?1:0,12,o)}const r=Et();let x=0,z=0;for(const M of $){const v=at(M);v&&(x+=M.data.km,z++);const w=v?r&&M!==r?.35:1:.12;M.opacity=a?w:Ce(M.opacity,w,8,o),M.hl=Ce(M.hl,M===r?1:M===n.featured?.6:0,8,o),M.U.uOpacity.value=M.opacity,M.U.uHl.value=M.hl;const I=M.popT<=-5?1:M.popT<0?0:hn((l-M.popT)/.5),L=M===r||M===n.featured?1+.12*M.hl+(s?Math.sin(l*5)*.03*M.hl:0):1,j=Math.max(1e-4,I*L*(.82+.18*M.opacity));M.pin.scale.set(M.pinBase.x*j,M.pinBase.y*j,1),M.pinMat.opacity=Te(M.opacity*1.15,0,1),M.blob.visible=I>.05}let p=0;if(J){const M=i?2.9:1.95;G.forEach((v,w)=>{const I=v.r;let L,j;if(v.special?I?(L=l-v.t0,j=L<v.period?1:0,j||(v.r=null)):(j=0,L=0):(j=I.drawn&&at(I)?1:0,L=((l+v.offset)%v.period+v.period)%v.period),v.vis=Ce(v.vis,j,6,o),!I||v.vis<.01){fe.makeScale(0,0,0),J.setMatrixAt(w,fe),Q.setMatrixAt(w,fe),q.setMatrixAt(w,fe);return}let H,V=!0,Z=!0;L<v.oneWay?H=$t(L/v.oneWay):L<v.oneWay+v.pause?(H=1,Z=!1):L<2*v.oneWay+v.pause?(H=1-$t((L-v.oneWay-v.pause)/v.oneWay),V=!1):(H=0,Z=!1),mn(I,H,Ye);const te=.8/I.total;mn(I,Te(H+(V?te:-te),0,1),Vt);const se=Vt[0]-Ye[0],le=Vt[1]-Ye[1];if(Math.hypot(se,le)>1e-4){let ye=Math.atan2(-le,se)-v.yaw;ye=Math.atan2(Math.sin(ye),Math.cos(ye)),v.yaw+=ye*(1-Math.exp(-14*o))}j&&Z&&p++;const ie=M*Math.max(1e-4,Math.min(1,v.vis*1.3));we.setFromAxisAngle(Pe,v.yaw),F.set(Ye[0],b+.06,Ye[1]),me.setScalar(ie),fe.compose(F,we,me),J.setMatrixAt(w,fe);const ue=V&&!(H>=1&&!Z);me.setScalar(ue?ie:1e-4),fe.compose(F,we,me),Q.setMatrixAt(w,fe),me.set(ie*1.45,1,ie*.78),F.set(Ye[0]+.12*ie,b+.07,Ye[1]+.1*ie),fe.compose(F,we,me),q.setMatrixAt(w,fe)}),J.instanceMatrix.needsUpdate=Q.instanceMatrix.needsUpdate=q.instanceMatrix.needsUpdate=!0}const h=n.pointer.inside&&!n.pointer.touch&&s?n.pointer.nx:0,S=n.pointer.inside&&!n.pointer.touch&&s?n.pointer.ny:0;n.parallax.x=Ce(n.parallax.x,h,2,o),n.parallax.y=Ce(n.parallax.y,S,2,o);const A=s?Math.sin(l*.1)*.018:0;if(ft(re.polar-n.parallax.y*.035,re.az+n.parallax.x*.06+A,ke),n.statsT+=o,e.onStats&&(n.statsT>.25||o===0)){n.statsT=0;const M={routes:z,km:Math.round(x),trucksActive:p},v=`${M.routes}|${M.km}|${M.trucksActive}`;if(v!==n.statsKey){n.statsKey=v;try{e.onStats(M)}catch(w){console.warn(w)}}}}function ht(o){Zn(o),R.updateMatrixWorld(),n.pointer.dirty&&jt(),f.classList.contains("svm-on")&&rt(),m.render(C,R),Se()}function Zt(o){if(n.raf=0,n.destroyed||!n.visible||!n.tabVisible)return;const l=Math.min(.05,n.last?(o-n.last)/1e3:.016);n.last=o,ht(l),n.raf=requestAnimationFrame(Zt)}function Xt(){!n.raf&&n.ready&&n.visible&&n.tabVisible&&!n.destroyed&&(n.last=0,n.raf=requestAnimationFrame(Zt))}function vt(){n.raf&&cancelAnimationFrame(n.raf),n.raf=0}function Xn(){if(!n.introStarted&&(n.introStarted=!0,!(!s||e.intro===!1))){n.deptIntroT=0;for(const o of O.values())o.grow=.02;st()}}const Qt=new IntersectionObserver(o=>{for(const l of o)n.visible=l.isIntersecting,n.visible?(n.ready&&Xn(),Xt()):vt()},{threshold:.12}),Yt=()=>{n.tabVisible=!document.hidden,n.tabVisible?Xt():vt()};document.addEventListener("visibilitychange",Yt);const Kt=new ResizeObserver(()=>dt()),Jt=Promise.all([fetch(e.geoUrl).then(o=>{if(!o.ok)throw new Error("GeoJSON "+o.status);return o.json()}),fetch(e.routesUrl).then(o=>{if(!o.ok)throw new Error("rutas "+o.status);return o.json()})]).then(([o,l])=>{if(n.destroyed)return Ke;if(Fn(o,l),s&&e.intro!==!1){for(const r of O.values())r.grow=.02;B.group&&B.group.scale.setScalar(.001)}else{n.introDone=!0;for(const r of $)r.drawn=!0,r.U.uDraw.value=1,r.popT=-10}return n.ready=!0,dt(),Kt.observe(t),Qt.observe(t),n.pending.splice(0).forEach(r=>r()),typeof e.onReady=="function"&&e.onReady(Ke),Ke}).catch(o=>{throw console.warn("[sv-map]",o),o});Jt.catch(()=>{});function Qn(){var o,l;if(!n.destroyed){n.destroyed=!0,vt(),Qt.disconnect(),Kt.disconnect(),document.removeEventListener("visibilitychange",Yt),Ue.removeEventListener("pointermove",Nt),Ue.removeEventListener("pointerleave",Xe),Ue.removeEventListener("pointerdown",Gt),Ue.removeEventListener("pointerup",We);for(const r of N)(o=r.dispose)==null||o.call(r);for(const r of[J,Q,q])r==null||r.dispose();E.dispose(),k.dispose(),m.dispose(),(l=m.forceContextLoss)==null||l.call(m),y.remove()}}const Ke={ready:Jt,destroy:Qn,resize:()=>dt(),focusZone:Tt,playIntro:st,showDestination:qt,listDestinations:mt,select:(o,l=!1)=>Ct(o,l),get selected(){return n.selected},get mode(){return"routes"},get theme(){return"light"},get state(){var o;return{ready:n.ready,visible:n.visible,running:!!n.raf,introDone:n.introDone,focus:n.focus,pinned:((o=n.pinned)==null?void 0:o.data.id)??null}}};return Ke}function Oi(){try{const t=document.createElement("canvas");return!!(t.getContext("webgl2")||t.getContext("webgl"))}catch{return!1}}function Ii(t,e,a){getComputedStyle(t).position==="static"&&(t.style.position="relative");const i=document.createElement("div");i.className="svm-root svm-fallback",t.appendChild(i);const s="http://www.w3.org/2000/svg",d=document.createElementNS(s,"svg");d.setAttribute("width","100%"),d.setAttribute("height","100%"),d.setAttribute("preserveAspectRatio","xMidYMid meet"),d.style.position="absolute",d.style.inset="0",i.appendChild(d);const g=["#2c6ce2","#22529f","#1d4177","#19335b","#162a45"],u=E=>{var R,U,P;return E==="la-libertad"?0:(((R=Ae[E])==null?void 0:R.km)??999)<50?1:(((U=Ae[E])==null?void 0:U.km)??999)<60?2:(((P=Ae[E])==null?void 0:P.km)??999)<110?3:4},b=new Map;let y=null,c=null,f=!1;const m=[],T=()=>{for(const[E,R]of b){const U=E===y;R.setAttribute("fill",U?oe.brand:a==="select"?y?"#142233":"#1f3a5a":g[u(E)]),R.setAttribute("stroke",U?"#dff1ff":"rgba(124,196,255,.45)")}for(const E of m)E.el.setAttribute("opacity",!c||E.zone===c?.95:.1)},C=Promise.all([fetch(e.geoUrl).then(E=>E.json()),fetch(e.routesUrl).then(E=>E.json())]).then(([E,R])=>{if(f)return k;const U=[];for(const $ of E.features)for(const W of $.geometry.type==="Polygon"?[$.geometry.coordinates]:$.geometry.coordinates)U.push(...W[0]);const P=To().fitExtent([[8,8],[992,492]],{type:"MultiPoint",coordinates:U});d.setAttribute("viewBox","0 0 1000 500");const _=$=>"M"+$.map(W=>P(W).map(G=>G.toFixed(1)).join(",")).join("L")+"Z";for(const $ of E.features){const W=$.properties.id,G=document.createElementNS(s,"path");G.setAttribute("d",($.geometry.type==="Polygon"?[$.geometry.coordinates]:$.geometry.coordinates).map(B=>_(B[0])).join("")),G.setAttribute("stroke-width","1"),a==="select"&&(G.style.cursor="pointer",G.addEventListener("click",()=>k.select(W,!0)));const N=document.createElementNS(s,"title");N.textContent=$.properties.name,G.appendChild(N),d.appendChild(G),b.set(W,G)}if(a==="routes")for(const $ of R.routes){const W=document.createElementNS(s,"polyline");W.setAttribute("points",$.coordinates.map(G=>P(G).map(N=>N.toFixed(1)).join(",")).join(" ")),W.setAttribute("fill","none"),W.setAttribute("stroke",$.anchor?oe.amber:oe.blueLight),W.setAttribute("stroke-width","2"),d.appendChild(W),m.push({el:W,zone:$.zone})}const n=P([R.origin.lon,R.origin.lat]),O=document.createElementNS(s,"circle");return O.setAttribute("cx",n[0]),O.setAttribute("cy",n[1]),O.setAttribute("r",6),O.setAttribute("fill",oe.amber),d.appendChild(O),T(),a==="routes"&&e.onStats&&e.onStats({routes:R.routes.length,km:Math.round(R.routes.reduce(($,W)=>$+W.km,0)),trucksActive:0}),typeof e.onReady=="function"&&e.onReady(k),k});C.catch(E=>console.warn("[sv-map]",E));const k={ready:C,destroy(){f=!0,i.remove()},resize(){},playIntro(){},focusZone(E){c=E&&it[E]?E:null,T()},select(E,R=!1){if(!(E&&!Ae[E])&&(y=E||null,T(),R&&E&&typeof e.onSelect=="function")){const U=Ae[E];e.onSelect({id:E,name:U.name,km_from_quarry_approx:U.km,zone:U.zone,capital:U.capital,flete:Rn(U.zone)})}},get selected(){return y},get mode(){return a},get state(){return{ready:!0,fallback:!0}}};return e.selected&&k.select(e.selected),k}export{Ae as DEPARTMENTS,qe as LIGHT_PALETTE,it as ZONES,Ja as default,Rn as fleteForZone,Ka as kmForDepartment,Ja as mountSVMap,Ya as zoneForDepartment};
