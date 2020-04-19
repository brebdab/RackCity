import {
  AnchorButton,
  Classes,
  Position,
  Toaster,
  IToastProps,
  Intent,
  Alert,
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { connect, useSelector } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import Webcam from "react-webcam";
import "./barcodeScanner.scss";
import { API_ROOT } from "../../utils/api-config";
import { AssetObject, getHeaders } from "../../utils/utils";
import axios from "axios";
import { MobileAssetView } from "./mobileAssetView";

interface BarcodeScannerState {
  cameraHeight: number;
  cameraWidth: number;
  token?: string;
  asset: AssetObject | null;
  barcode_data: string;
  confirmationIsOpen: boolean;
  showAsset: boolean;
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

  private addErrorToast = (message: string) => {
    this.addToast({ message: message, intent: Intent.DANGER });
  };

  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref),
  };

  public state = {
    cameraHeight: 0,
    cameraWidth: 0,
    asset: null,
    confirmationIsOpen: false,
    showAsset: false,
    barcode_data: "",
    token: "",
  };

  constraints = {
    // height: 720,
    // width: 1280,
    height: 1400,
    width: 360,
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
          const asset_data = res.data.asset_data;
          this.setState({
            token: token,
            barcode_data: res.data.barcode_data,
            asset: asset_data,
            confirmationIsOpen: true,
          });
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
          Scan Barcode
        </AnchorButton>
      </div>
    );
  };

  getDataOverride(asset:AssetObject ){
    const { cpu, display_color, storage, memory_gb } = asset
    return { cpu, display_color, storage, memory_gb };
  }
  private renderAssetView(asset: AssetObject | null) {
    if (asset) {
      return (
        <MobileAssetView
          {...this.props}
          token={this.state.token}
          asset={asset}
          data_override={this.getDataOverride(asset)}
        />
      );
    } else {
      this.addErrorToast("ERROR: No data found for selected asset");
      this.setState({
        asset: null,
        showAsset: false,
      });
      return;
    }
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
      <div className={Classes.DARK} id={"mobile-app"}>
        {this.state.showAsset && this.state.asset ? (
          this.renderAssetView(this.state.asset)
        ) : (
          <>
            <this.WebcamCapture />
            <Toaster
              autoFocus={false}
              canEscapeKeyClear={true}
              position={Position.TOP}
              ref={this.refHandlers.toaster}
            />
            <Alert
              className={Classes.DARK}
              isOpen={this.state.confirmationIsOpen}
              onCancel={() => {
                this.setState({
                  confirmationIsOpen: false,
                  asset: null,
                });
              }}
              onConfirm={() => {
                this.setState({
                  showAsset: true,
                });
              }}
              style={{width: "80%"}}
              cancelButtonText={"Cancel"}
              confirmButtonText={"View Asset"}
            >
              <p>
                Found barcode with value: {this.state.barcode_data}.<br/>Would you
                like to view this asset?
              </p>
            </Alert>
          </>
        )}
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
