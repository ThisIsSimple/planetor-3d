# Babylon.js 좌표 시스템 개발 가이드

이 문서는 Planator 프로젝트의 Babylon.js 좌표 시스템과 행성 표면 오브젝트 배치 방법을 설명합니다.

---

## 1. 개요

### Babylon.js는 왼손 좌표계(Left-handed)를 사용합니다

```
      +Y (위)
       |
       |
       |_______ +X (오른쪽)
      /
     /
    +Z (앞/카메라가 바라보는 방향)
```

### Three.js와의 차이점

| 항목 | Babylon.js | Three.js |
|------|------------|----------|
| 좌표계 | 왼손 (Left-handed) | 오른손 (Right-handed) |
| Z축 방향 | +Z = 앞 (forward) | -Z = 앞 (forward) |
| Cross Product 결과 | 왼손 법칙 | 오른손 법칙 |

---

## 2. 글로벌 좌표계

### 축 방향
- **+X**: 오른쪽 (Right)
- **+Y**: 위쪽 (Up)
- **+Z**: 앞쪽 (Forward, 카메라가 바라보는 방향)

### 기본 메시 방향
| 메시 타입 | 기본 방향 |
|-----------|-----------|
| `CreateCylinder` | Y축을 따라 서있음 (위아래로 긴 형태) |
| `CreateCapsule` | Y축을 따라 서있음 |
| `CreateBox` | 모든 축에 대칭 |
| `CreatePlane` | XY 평면에 생성, +Z를 바라봄 |

---

## 3. 행성 표면 로컬 좌표계

행성 위의 오브젝트는 **행성 중심에서 바깥 방향**이 로컬 Y축(up)이 됩니다.

```
        오브젝트
           |
           | 로컬 Y (up = surface normal)
           |
    ───────●─────── 행성 표면
          /|\
         / | \
        /  |  \
           ● 행성 중심
```

### 표면 법선 (Surface Normal) 계산

```javascript
// 오브젝트 위치에서 행성 중심을 향하는 벡터의 반대 방향
const surfaceNormal = objectPosition.clone().normalize();
// 이것이 로컬 Y축 (up)이 됩니다
```

---

## 4. Orthonormal Basis 생성 (alignToSurface 패턴)

행성 표면에 오브젝트를 정렬하려면 **orthonormal basis** (직교 정규 기저)를 생성해야 합니다.

### 왼손 좌표계용 Cross Product 순서

**중요**: Babylon.js의 `Vector3.Cross(a, b)`는 표준 수학적 외적을 반환합니다.
왼손 좌표계에서 올바른 축을 얻으려면 다음 순서를 사용합니다:

```javascript
// X = Y × Z (up × forward)
// Z = X × Y (xAxis × up)

let xAxis = BABYLON.Vector3.Cross(up, forward);
xAxis.normalize();
const zAxis = BABYLON.Vector3.Cross(xAxis, up).normalize();
```

### 완전한 alignToSurface 함수

```javascript
function alignToSurface(node, up) {
    // 1. 기준 forward 방향 설정
    let zAxis = new BABYLON.Vector3(0, 0, 1);
    
    // 2. X축 계산: Y × Z (왼손 좌표계)
    let xAxis = BABYLON.Vector3.Cross(up, zAxis);
    if (xAxis.lengthSquared() < 0.001) {
        // up이 Z축과 평행한 경우 fallback
        xAxis = BABYLON.Vector3.Cross(up, new BABYLON.Vector3(1, 0, 0));
    }
    xAxis.normalize();
    
    // 3. Z축 재계산: X × Y (왼손 좌표계)
    zAxis = BABYLON.Vector3.Cross(xAxis, up).normalize();
    
    // 4. 회전 행렬 생성 (column-major)
    const rotMatrix = BABYLON.Matrix.FromValues(
        xAxis.x, xAxis.y, xAxis.z, 0,  // Column 0: X축
        up.x, up.y, up.z, 0,            // Column 1: Y축 (surface normal)
        zAxis.x, zAxis.y, zAxis.z, 0,  // Column 2: Z축
        0, 0, 0, 1                      // Column 3: Translation
    );
    
    // 5. 쿼터니언으로 변환하여 적용
    node.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotMatrix);
}
```

### Matrix.FromValues 파라미터 순서

`BABYLON.Matrix.FromValues`는 **column-by-column** 순서로 값을 받습니다:

```javascript
Matrix.FromValues(
    col0_row0, col0_row1, col0_row2, col0_row3,  // Column 0 (X축)
    col1_row0, col1_row1, col1_row2, col1_row3,  // Column 1 (Y축)
    col2_row0, col2_row1, col2_row2, col2_row3,  // Column 2 (Z축)
    col3_row0, col3_row1, col3_row2, col3_row3   // Column 3 (Translation)
)
```

회전 행렬에서:
- **Column 0** = 새로운 X축 방향 벡터
- **Column 1** = 새로운 Y축 방향 벡터 (surface normal)
- **Column 2** = 새로운 Z축 방향 벡터

---

## 5. 벡터 표면 투영

카메라 forward 등의 벡터를 표면에 평행하게 투영해야 할 때 사용합니다.

### 투영 공식

```javascript
// forward를 표면 평면에 투영 (up 성분 제거)
let forward = originalForward.clone();
const upComponent = BABYLON.Vector3.Dot(forward, up);
forward = forward.subtract(up.scale(upComponent));

// forward가 up과 거의 평행한 경우 fallback
if (forward.lengthSquared() < 0.001) {
    forward = new BABYLON.Vector3(1, 0, 0);
    const upComp2 = BABYLON.Vector3.Dot(forward, up);
    forward = forward.subtract(up.scale(upComp2));
}
forward.normalize();
```

### 사용 예시: 건물 배치

```javascript
function updatePreviewTransform() {
    const up = spawnPos.clone().normalize();  // 표면 법선
    
    // 카메라 forward를 표면에 투영
    let forward = cameraState.forward.clone();
    const upComponent = BABYLON.Vector3.Dot(forward, up);
    forward = forward.subtract(up.scale(upComponent));
    if (forward.lengthSquared() < 0.001) {
        forward = new BABYLON.Vector3(1, 0, 0);
        const upComp2 = BABYLON.Vector3.Dot(forward, up);
        forward = forward.subtract(up.scale(upComp2));
    }
    forward.normalize();
    
    // orthonormal basis 생성
    let xAxis = BABYLON.Vector3.Cross(up, forward);
    xAxis.normalize();
    const zAxis = BABYLON.Vector3.Cross(xAxis, up).normalize();
    
    // 회전 행렬 적용
    const rotMatrix = BABYLON.Matrix.FromValues(
        xAxis.x, xAxis.y, xAxis.z, 0,
        up.x, up.y, up.z, 0,
        zAxis.x, zAxis.y, zAxis.z, 0,
        0, 0, 0, 1
    );
    node.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotMatrix);
}
```

---

## 6. 오브젝트별 배치 가이드

### 플레이어/캐릭터

```javascript
// Player.js - updatePlayerMovement()
const forward = moveDir;  // 이동 방향

// orthonormal basis 생성
let xAxis = BABYLON.Vector3.Cross(playerState.up, forward);
xAxis.normalize();
const zAxis = BABYLON.Vector3.Cross(xAxis, playerState.up).normalize();

const rotationMatrix = BABYLON.Matrix.FromValues(
    xAxis.x, xAxis.y, xAxis.z, 0,
    playerState.up.x, playerState.up.y, playerState.up.z, 0,
    zAxis.x, zAxis.y, zAxis.z, 0,
    0, 0, 0, 1
);
player.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotationMatrix);
```

- 플레이어의 `up`은 `playerState.position.normalize()`로 계산
- 이동 방향이 플레이어의 forward(+Z)가 됨

### 나무/건물 (정적 오브젝트)

```javascript
// Environment.js - createTreeMesh()
const up = pos.clone().normalize();
alignToSurface(tree, up);

// 자식 메시는 로컬 좌표 사용
trunk.position.y = 1.25;  // 표면 위로 올림
leaves.position.y = 3.0;
```

- `alignToSurface` 호출 후 자식 메시는 로컬 Y축을 "위"로 사용
- `position.y`를 양수로 설정하면 표면 위로 올라감

### 체력바 (빌보드)

```javascript
// WorldUI.js - HealthBar.update()
const surfaceUp = this.target.position.clone().normalize();

// 카메라를 향하되 surface up을 유지
const forward = camera.position.subtract(this.node.position).normalize();

let xAxis = BABYLON.Vector3.Cross(surfaceUp, forward);
xAxis.normalize();
const zAxis = BABYLON.Vector3.Cross(xAxis, surfaceUp).normalize();

const rotMatrix = BABYLON.Matrix.FromValues(
    xAxis.x, xAxis.y, xAxis.z, 0,
    surfaceUp.x, surfaceUp.y, surfaceUp.z, 0,
    zAxis.x, zAxis.y, zAxis.z, 0,
    0, 0, 0, 1
);
this.node.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotMatrix);
```

- 표면 up을 유지하면서 카메라를 바라봄
- 기울어지지 않는 안정적인 빌보드 효과

### 우주선 (수직 배치)

```javascript
// Environment.js - spawnCrashedShip()
alignToSurface(ship, shipUp);

// 캡슐 몸체 - 회전 없이 Y축 방향으로 서있음
const body = BABYLON.MeshBuilder.CreateCapsule("shipBody", {
    radius: 1.8,
    height: 7.6
}, scene);
body.parent = ship;
body.position.y = 3.8;  // 바닥이 지면에 닿도록

// 다른 부품들도 로컬 Y축 기준으로 배치
cockpit.position.set(0, 7.0, 0.8);  // 상단
leftWing.position.set(-2.5, 4, 0);  // 중간
engine1.position.set(-0.8, 0.5, 0); // 하단
```

---

## 7. 주의사항

### rotationQuaternion vs rotation 혼용 금지

```javascript
// ❌ 잘못된 예: rotationQuaternion 설정 후 rotation 사용
node.rotationQuaternion = someQuaternion;
node.rotation.x += 0.1;  // 무시됨!

// ✅ 올바른 예: quaternion으로 추가 회전 적용
node.rotationQuaternion = someQuaternion;
const additionalRot = BABYLON.Quaternion.RotationAxis(axis, angle);
node.rotationQuaternion = node.rotationQuaternion.multiply(additionalRot);
```

Babylon.js에서 `rotationQuaternion`이 설정되면 `rotation` 속성은 완전히 무시됩니다.

### Cross Product 순서의 중요성

```javascript
// ❌ 잘못된 순서 (오른손 좌표계용)
xAxis = BABYLON.Vector3.Cross(forward, up);  // Z × Y
zAxis = BABYLON.Vector3.Cross(up, xAxis);    // Y × X

// ✅ 올바른 순서 (왼손 좌표계용)
xAxis = BABYLON.Vector3.Cross(up, forward);  // Y × Z = X
zAxis = BABYLON.Vector3.Cross(xAxis, up);    // X × Y = Z
```

### Fallback 처리 필수

두 벡터가 평행할 때 Cross Product 결과가 0이 됩니다:

```javascript
let xAxis = BABYLON.Vector3.Cross(up, forward);
if (xAxis.lengthSquared() < 0.001) {
    // fallback 벡터 사용
    xAxis = BABYLON.Vector3.Cross(up, new BABYLON.Vector3(1, 0, 0));
    if (xAxis.lengthSquared() < 0.001) {
        xAxis = BABYLON.Vector3.Cross(up, new BABYLON.Vector3(0, 0, 1));
    }
}
xAxis.normalize();
```

---

## 8. 빠른 참조 코드

### 표면에 오브젝트 정렬

```javascript
function alignToSurface(node, surfacePosition) {
    const up = surfacePosition.clone().normalize();
    
    let zAxis = new BABYLON.Vector3(0, 0, 1);
    let xAxis = BABYLON.Vector3.Cross(up, zAxis);
    if (xAxis.lengthSquared() < 0.001) {
        xAxis = BABYLON.Vector3.Cross(up, new BABYLON.Vector3(1, 0, 0));
    }
    xAxis.normalize();
    zAxis = BABYLON.Vector3.Cross(xAxis, up).normalize();
    
    const rotMatrix = BABYLON.Matrix.FromValues(
        xAxis.x, xAxis.y, xAxis.z, 0,
        up.x, up.y, up.z, 0,
        zAxis.x, zAxis.y, zAxis.z, 0,
        0, 0, 0, 1
    );
    
    node.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotMatrix);
}
```

### 특정 방향을 바라보도록 정렬

```javascript
function alignToSurfaceFacing(node, surfacePosition, targetDirection) {
    const up = surfacePosition.clone().normalize();
    
    // targetDirection을 표면에 투영
    let forward = targetDirection.clone();
    const upComponent = BABYLON.Vector3.Dot(forward, up);
    forward = forward.subtract(up.scale(upComponent));
    if (forward.lengthSquared() < 0.001) {
        forward = new BABYLON.Vector3(1, 0, 0);
        const upComp2 = BABYLON.Vector3.Dot(forward, up);
        forward = forward.subtract(up.scale(upComp2));
    }
    forward.normalize();
    
    let xAxis = BABYLON.Vector3.Cross(up, forward);
    xAxis.normalize();
    const zAxis = BABYLON.Vector3.Cross(xAxis, up).normalize();
    
    const rotMatrix = BABYLON.Matrix.FromValues(
        xAxis.x, xAxis.y, xAxis.z, 0,
        up.x, up.y, up.z, 0,
        zAxis.x, zAxis.y, zAxis.z, 0,
        0, 0, 0, 1
    );
    
    node.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotMatrix);
}
```

---

## 관련 파일

- `js/world/Environment.js` - `alignToSurface()` 함수 정의
- `js/systems/Building.js` - `updatePreviewTransform()` 건물 배치
- `js/entities/Player.js` - `updatePlayerMovement()` 플레이어 회전
- `js/ui/WorldUI.js` - `HealthBar.update()` 체력바 빌보드

