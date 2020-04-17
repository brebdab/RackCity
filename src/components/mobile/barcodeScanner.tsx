import {
  AnchorButton,
  Classes,
  Position,
  Toaster,
  IToastProps,
  Intent,
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { connect, useSelector } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import Webcam from "react-webcam";
import "./barcodeScanner.scss";
import { API_ROOT } from "../../utils/api-config";
import {getHeaders, ROUTES} from "../../utils/utils";
import axios from "axios";

interface BarcodeScannerState {
  cameraHeight: number;
  cameraWidth: number;
}
interface RootState {
  token: string;
}
interface BarcodeScannerProps {
  token: string;
  isMobile: boolean;
}

export class BarcodeScanner extends React.PureComponent<
  RouteComponentProps & BarcodeScannerProps,
  BarcodeScannerState
> {
  private toaster: Toaster = {} as Toaster;
  private addToast = (toast: IToastProps) => {
    toast.timeout = 5000;
    if (this.toaster) {
      this.toaster.show(toast);
    }
  };
  private addSuccessToast = (message: string) => {
    this.addToast({ message: message, intent: Intent.PRIMARY });
  };
  private addErrorToast = (message: string) => {
    this.addToast({ message: message, intent: Intent.DANGER });
  };

  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref),
  };

  public state = {
    cameraHeight: 0,
    cameraWidth: 0,
  };

  constraints = {
    height: 720,
    width: 1280,
    facingMode: { exact: "environment" },
  };
  WebcamCapture = () => {
    let webcamRef: any;
    webcamRef = React.useRef(null);
    let capture: Function;
    const token = useSelector((state: RootState) => {
      return state.token;
    });
    capture = React.useCallback(() => {
      const imageSrc = webcamRef.current.getScreenshot();
      let imgStr: string;
      imgStr = imageSrc.substr(23);
      axios
        .post(
          API_ROOT + "api/assets/asset-barcode",
          { img_string: imgStr },
          getHeaders(token)
        )
        .then((res: any) => {
          const id = res.data.asset_data.id;
          this.props.history.push(ROUTES.ASSETS + "/" + id)
        })
        .catch((err: any) => {
          this.addErrorToast(err.response.data.failure_message);
        });
    }, [webcamRef, token]);
    return (
      <div>
        <Webcam
          audio={false}
          height={this.state.cameraHeight * 0.8}
          screenshotFormat={"image/jpeg"}
          width={this.state.cameraWidth}
          videoConstraints={this.constraints}
          ref={webcamRef}
        />
        <AnchorButton
          className={"scanner-button"}
          intent={"primary"}
          minimal
          icon="camera"
          onClick={() => {
            capture();
          }}
        >
          Capture photo
        </AnchorButton>
      </div>
    );
  };

  render() {
    const height = window.innerHeight;
    const width = document.body.offsetWidth;
    if (this.state.cameraHeight === 0 && this.state.cameraWidth === 0) {
      this.setState({
        cameraWidth: width,
        cameraHeight: height,
      });
    }

    return (
      <div className={Classes.DARK}>
        <this.WebcamCapture />
        <Toaster
          autoFocus={false}
          canEscapeKeyClear={true}
          position={Position.TOP}
          ref={this.refHandlers.toaster}
        />
      </div>
    );
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
    isMobile: state.isMobile,
  };
};

export default withRouter(connect(mapStatetoProps)(BarcodeScanner));
