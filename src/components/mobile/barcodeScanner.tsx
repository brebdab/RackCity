import { Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import Webcam from "react-webcam";

interface BarcodeScannerState {
  result: string;
  image: any;
  cameraHeight: number;
  cameraWidth: number;
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
    result: "",
    image: undefined,
    cameraHeight: 0,
    cameraWidth: 0,
  };

  handleScan(data: string) {
    this.setState({
      result: data,
    });
  }
  handleError(err: any) {
    console.error(err);
  }
  constraints = {
    height: 720,
    width: 1280,
    facingMode: { exact: "environment" },
  };
  WebcamCapture = () => {
    let webcamRef: any;
    webcamRef = React.useRef(null);
    const capture = React.useCallback(() => {
      const imageSrc = webcamRef.current.getScreenshot();
      this.setState({
        image: imageSrc,
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
        <button onClick={capture}>Capture photo</button>
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
