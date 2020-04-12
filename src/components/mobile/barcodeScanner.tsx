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
    cameraWidth: 0
  };

  handleScan(data: string) {
    this.setState({
      result: data,
    });
  }
  handleError(err: any) {
    console.error(err);
  }

  render() {
    const height = window.innerHeight;
    const width = document.body.offsetWidth;
    if (this.state.cameraHeight === 0 && this.state.cameraWidth === 0) {
      this.setState({
        cameraWidth: width,
        cameraHeight: height
      })
    }
    const constraints = {
      height: this.state.cameraHeight*0.9,
      width: this.state.cameraWidth,
      // facingMode: "user",
      facingMode: { exact: "environment" },
    };

    const WebcamCapture = () => {
      let webcamRef: any;
      webcamRef = React.useRef(null);
      const capture = React.useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        console.log(webcamRef);
        console.log(imageSrc)
        this.setState({
          image: imageSrc,
        });
      }, [webcamRef]);
      return (
        <div>
          <Webcam
            audio={false}
            height={this.state.cameraHeight}
            screenshotFormat={"image/jpeg"}
            width={this.state.cameraWidth}
            videoConstraints={constraints}
            ref={webcamRef}
          />
          <button onClick={capture}>Capture photo</button>
        </div>
      );
    };

    return (
      <div className={Classes.DARK}>
        {/* <BarcodeReader onError={this.handleError} onScan={this.handleScan} /> */}
        <WebcamCapture />
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
