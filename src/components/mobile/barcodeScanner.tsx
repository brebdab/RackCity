import { AnchorButton, Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import Webcam from "react-webcam";
import "./barcodeScanner.scss";
import { API_ROOT } from "../../utils/api-config";
import { getHeaders } from "../../utils/utils";
import axios from "axios";

interface BarcodeScannerState {
  result: string;
  image: any;
  cameraHeight: number;
  cameraWidth: number;
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
    result: "",
    image: undefined,
    cameraHeight: 0,
    cameraWidth: 0,
    token: ""
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
      var imgStr = imageSrc.substr(23);
      console.log(this.props)
      console.log(this.state)
      this.setState({
        image: imageSrc,
      });
      axios
        .post(
          API_ROOT + "api/assets/asset-barcode",
          { img_string: imgStr },
          getHeaders(this.props.token)
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
            this.getDataFromString();
          }}
        >
          Capture photo
        </AnchorButton>
      </div>
    );
  };

  private getDataFromString() {
    console.log(this.props.token)
    console.log(this.state)
  }

  componentDidMount() {
    this.setState({
      token: this.props.token
    })
  }

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
