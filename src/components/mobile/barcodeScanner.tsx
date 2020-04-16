import { AnchorButton, Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { connect, useSelector } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import Webcam from "react-webcam";
import "./barcodeScanner.scss";
import { API_ROOT } from "../../utils/api-config";
import { getHeaders } from "../../utils/utils";
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
          alert(JSON.stringify(res));
        })
        .catch((err: any) => {
          alert(JSON.stringify(err));
        });
    }, [webcamRef]);
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
