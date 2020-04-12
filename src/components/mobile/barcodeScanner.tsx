import { Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import Webcam from "react-webcam";

interface BarcodeScannerState {
  result: string;
  image: any;
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
    image: undefined
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
    const height = document.body.offsetHeight;
    const width = document.body.offsetWidth;
    const constraints = {
      height: height,
      width: width,
      facingMode: "user",
      //   facingMode: { exact: "environment" }
    };

    const WebcamCapture = () => {
      let webcamRef: any;
      webcamRef = React.useRef(null);
      //   const webcamRef = React.createRef<HTMLVideoElement>();
      const capture = React.useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        console.log(webcamRef)
        this.setState({
          image: imageSrc
        });
      }, [webcamRef]);
      return (
        <div>
          <Webcam
            audio={false}
            height={height}
            screenshotFormat={"image/jpeg"}
            width={width}
            videoConstraints={constraints}
            ref={webcamRef}
            mirrored={true}
          />
          <button onClick={capture}>Capture photo</button>
        </div>
      );
    };

    return (
      <div className={Classes.DARK}>
        <p>Scanner</p>
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
