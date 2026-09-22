import numpy as np
rng=np.random.default_rng(3)
def K_of(f35,w,h): f=f35*np.hypot(w,h)/43.27; return np.array([[f,0,w/2],[0,f,h/2],[0,0,1.0]])
def rot(yaw,pitch,roll):
    cy,sy=np.cos(yaw),np.sin(yaw); cp,sp=np.cos(pitch),np.sin(pitch); cr,sr=np.cos(roll),np.sin(roll)
    Ry=np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]]); Rx=np.array([[1,0,0],[0,cp,-sp],[0,sp,cp]]); Rz=np.array([[cr,-sr,0],[sr,cr,0],[0,0,1]])
    return Rz@Rx@Ry
def project(K,R,t,X):  # X: Nx3 world (mm)
    P=K@np.hstack([R,t.reshape(3,1)]); x=(P@np.hstack([X,np.ones((len(X),1))]).T).T; return x[:,:2]/x[:,2:]
def homog(src,dst):  # DLT unit square -> image
    A=[]
    for (u,v),(x,y) in zip(src,dst):
        A.append([u,v,1,0,0,0,-x*u,-x*v,-x]); A.append([0,0,0,u,v,1,-y*u,-y*v,-y])
    _,_,Vt=np.linalg.svd(np.array(A)); H=Vt[-1].reshape(3,3); return H/H[2,2]
def aspect_from_H(H,f,cx,cy):
    h1,h2=H[:,0],H[:,1]
    g=lambda h: np.array([(h[0]-cx*h[2])/f,(h[1]-cy*h[2])/f,h[2]])
    return np.linalg.norm(g(h2))/np.linalg.norm(g(h1))
def f_from_H(H,cx,cy):
    h1,h2=H[:,0],H[:,1]; a1,a2=h1[0]-cx*h1[2],h2[0]-cx*h2[2]; b1,b2=h1[1]-cy*h1[2],h2[1]-cy*h2[2]
    den=h1[2]*h2[2]; num=-(a1*a2+b1*b2)
    if abs(den)<1e-12 or num/den<=0: return None
    return np.sqrt(num/den)
W,Hh=4000.,2400.; w,h=3000,2250
corners=np.array([[0,0,0],[W,0,0],[W,Hh,0],[0,Hh,0]],float)  # wall plane z=0, y down
print(f"{'view':38s} {'trueF':>6s} {'estF':>6s} {'asp tru':>8s} {'asp estF':>9s} {'asp 26mm':>9s} {'asp 24mm':>9s}")
for name,(yaw,pitch,roll,dist,f35) in {
 'near frontal, 26mm':(3,2,1,3500,26),
 'oblique 15deg yaw, 26mm':(15,4,1,3800,26),
 'oblique 25deg yaw 8 pitch, 24mm':(25,8,2,4000,24),
 'oblique 30 yaw, 13mm ultrawide':(30,5,0,2500,13),
 'from a corner, 35 yaw 10 pitch 26mm':(35,10,3,4500,26)}.items():
    K=K_of(f35,w,h); R=rot(np.radians(yaw),np.radians(pitch),np.radians(roll))
    # camera looking at the wall centre from distance
    C=np.array([W/2,Hh/2,0])+R.T@np.array([0,0,-dist]); t=-R@C
    px=project(K,R,t,corners)
    res=[]
    for trial in range(200):
        noisy=px+rng.normal(0,1.5,px.shape)
        H=homog([(0,0),(1,0),(1,1),(0,1)],noisy)
        fe=f_from_H(H,w/2,h/2); res.append([aspect_from_H(H,K[0,0],w/2,h/2), aspect_from_H(H,fe,w/2,h/2) if fe else np.nan, aspect_from_H(H,K_of(26,w,h)[0,0],w/2,h/2), aspect_from_H(H,K_of(24,w,h)[0,0],w/2,h/2), fe or np.nan])
    r=np.nanmean(res,axis=0); tr=Hh/W
    print(f"{name:38s} {K[0,0]:6.0f} {r[4]:6.0f} {100*(r[0]/tr-1):+7.2f}% {100*(r[1]/tr-1):+8.2f}% {100*(r[2]/tr-1):+8.2f}% {100*(r[3]/tr-1):+8.2f}%   corners px: {np.round(px).astype(int).tolist()}")
