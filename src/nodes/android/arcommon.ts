import * as utils from "tns-core-modules/utils/utils";
import { ARAddOptions, ARCommonNode as IARCommonNode, ARDimensions2D, ARNodeInteraction, ARPosition, ARRotation, ARScale } from "../../ar-common";

declare const java: any;

export abstract class ARCommonNode implements IARCommonNode {
  id: string;
  android: com.google.ar.sceneform.Node;
  position: ARPosition;
  onTapHandler?: (interaction: ARNodeInteraction) => void;
  onLongPressHandler?: (interaction: ARNodeInteraction) => void;
  onPanHandler?: (interaction: ARNodeInteraction) => void;
  draggingEnabled: boolean;
  rotatingEnabled: boolean;

  private static defaultMaterial: com.google.ar.sceneform.rendering.Material;

  constructor(options: ARAddOptions, node: com.google.ar.sceneform.Node) {
    this.android = node;

    this.onTapHandler = options.onTap;
    this.onLongPressHandler = options.onLongPress;
    // this.onPanHandler = options.onPan;
    this.draggingEnabled = options.draggingEnabled;
    this.rotatingEnabled = options.rotatingEnabled;

    if (options.rotation) {
      this.rotateBy(options.rotation);
    }

    if (options.scale) {
      this.android.setLocalScale(
          new (<any>com.google.ar.sceneform).math.Vector3(
              options.scale instanceof ARScale ? options.scale.x : options.scale,
              options.scale instanceof ARScale ? options.scale.y : options.scale,
              options.scale instanceof ARScale ? options.scale.z : options.scale)
      );
      console.log("scale set to: " + this.android.getLocalScale());
    }

    if (options.position) {
      this.android.setLocalPosition(
          new (<any>com.google.ar.sceneform).math.Vector3(
              options.position.x,
              options.position.y,
              options.position.z
          )
      );
    }

    // generate a unique name, used for later reference
    this.id = (JSON.stringify(options.position) + "_" + new Date().getTime());

    // TODO for these, consider adopting TNSNode's gestures in Blackwell's fork
    this.android.setOnTapListener(new com.google.ar.sceneform.Node.OnTapListener({
      onTap: (hitResult: any /* com.google.ar.sceneform.HitTestResult */, motionEvent: android.view.MotionEvent) => {
        const duration = motionEvent.getEventTime() - motionEvent.getDownTime();
        const nativePosition = this.android.getLocalPosition();
        this.position = {
          x: nativePosition.x,
          y: nativePosition.y,
          z: nativePosition.z
        };

        if (duration > 700) { // a bit arbitrary.. not sure what Android considers a longpress..
          // assume longpress
          this.onLongPressHandler && this.onLongPressHandler({
            node: this,
            touchPosition: {
              x: hitResult.getPoint().x,
              y: hitResult.getPoint().y
            }
          });
        } else {
          // assume tap
          if (node instanceof com.google.ar.sceneform.ux.BaseTransformableNode) {
            node.select();
          }
          this.onTapHandler && this.onTapHandler({
            node: this,
            touchPosition: {
              x: hitResult.getPoint().x,
              y: hitResult.getPoint().y
            }
          });
        }
      }
    }));
  }

  moveBy(by: ARPosition): void {
    const currentPosition = this.android.getLocalPosition();
    this.android.setLocalPosition(
        new (<any>com.google.ar.sceneform).math.Vector3(
            currentPosition.x + by.x,
            currentPosition.y + by.y,
            currentPosition.z + by.z
        )
    );
  }

  setPosition(pos: ARPosition): void {
    this.android.setLocalPosition(
        new (<any>com.google.ar.sceneform).math.Vector3(
            pos.x,
            pos.y,
            pos.z
        )
    );
  }

  setWorldPosition(pos: ARPosition): void {
    this.android.setWorldPosition(
        new (<any>com.google.ar.sceneform).math.Vector3(
            pos.x,
            pos.y,
            pos.z
        )
    );
  }


  rotateBy(by: ARRotation): void {
    const currentRotation = this.android.getLocalRotation();
    const rotateBy = new (<any>com.google.ar.sceneform).math.Quaternion(
        new (<any>com.google.ar.sceneform).math.Vector3(
            by.x,
            by.y,
            by.z
        )
    );
    this.android.setLocalRotation((<any>com.google.ar.sceneform).math.Quaternion.multiply(currentRotation, rotateBy));
  }

  setRotation(rot: ARRotation): void {
    this.android.setLocalRotation(
        new (<any>com.google.ar.sceneform).math.Quaternion(
            new (<any>com.google.ar.sceneform).math.Vector3(
                rot.x,
                rot.y,
                rot.z
            )
        )
    );
  }

  scaleBy(by: number | ARScale): void {
    const currentScale = this.android.getLocalScale();
    this.android.setLocalScale(
        new (<any>com.google.ar.sceneform).math.Vector3(
            currentScale.x + (by instanceof ARScale ? by.x : by),
            currentScale.y + (by instanceof ARScale ? by.y : by),
            currentScale.z + (by instanceof ARScale ? by.z : by))
    );
  }

  setScale(scale: number | ARScale): void {
    this.android.setLocalScale(
        new (<any>com.google.ar.sceneform).math.Vector3(
            (scale instanceof ARScale ? scale.x : scale),
            (scale instanceof ARScale ? scale.y : scale),
            (scale instanceof ARScale ? scale.z : scale))
    );
  }

  onTap(touchPosition: ARDimensions2D): void {
    this.onTapHandler && this.onTapHandler({
      node: this,
      touchPosition
    });
  }

  onLongPress(touchPosition: ARDimensions2D): void {
    this.onLongPressHandler && this.onLongPressHandler({
      node: this,
      touchPosition
    });
  }

  onPan(touchPosition: ARDimensions2D): void {
    this.onPanHandler && this.onPanHandler({
      node: this,
      touchPosition
    });
  }

  setVisible(visible: boolean): void {
    this.android.setEnabled(visible);
  }

  allowDragging(): boolean {
    return this.draggingEnabled;
  }

  allowRotating(): boolean {
    return this.rotatingEnabled;
  }

  remove(): void {
    // TODO would be nice if we could delete it from the cache.. perhaps move it to this common class as a static prop?
    // ARState.shapes.delete(this.id);
    this.android.setParent(null);
  }

  protected static getDefaultMaterial(): Promise<com.google.ar.sceneform.rendering.Material> {
    return new Promise<com.google.ar.sceneform.rendering.Material>((resolve, reject) => {
      if (ARCommonNode.defaultMaterial) {
        resolve(ARCommonNode.defaultMaterial);
        return;
      }

      com.google.ar.sceneform.rendering.MaterialFactory.makeOpaqueWithColor(
          utils.ad.getApplicationContext(),
          new com.google.ar.sceneform.rendering.Color(android.graphics.Color.MAGENTA))
          .thenAccept(new java.util.function.Consumer({
            accept: material => {
              ARCommonNode.defaultMaterial = material;
              resolve(material);
            }
          }));
    });
  }

  private static degToRadians(degrees: number): number {
    return degrees * (3.14159265359 / 180);
  }
}
