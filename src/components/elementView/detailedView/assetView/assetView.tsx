import {
  Classes,
  AnchorButton,
  Alert,
  Toaster,
  IToastProps,
  Position,
  Intent
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { API_ROOT } from "../../../../utils/api-config";
import PropertiesView from "../propertiesView";
import { RouteComponentProps, withRouter } from "react-router";
import "./assetView.scss";
import { connect } from "react-redux";
import {
  AssetObject,
  ElementType,
  getHeaders
} from "../../../../utils/utils";
import FormPopup from "../../../../forms/formPopup";
import { FormTypes } from "../../../../forms/formUtils";

export interface AssetViewProps {
  token: string;
  rid: any;
  isAdmin: boolean;
}
// Given an rid, will perform a GET request of that rid and display info about that instnace

var console: any = {};
console.log = function () { };
async function getData(assetkey: string, token: string) {
  const headers = {
    headers: {
      Authorization: "Token " + token
    }
  };
  return await axios
    .get(API_ROOT + "api/assets/" + assetkey, headers)
    .then(res => {
      const data = res.data;
      return data;
    });
}

interface AssetViewState {
  asset: AssetObject | undefined;
  columns: Array<string>;
  fields: Array<string>;
  isFormOpen: boolean;
  isDeleteOpen: boolean;
  isAlertOpen: boolean;
}

export class AssetView extends React.PureComponent<
  RouteComponentProps & AssetViewProps,
  AssetViewState
  > {
  public state: AssetViewState = {
    asset: undefined,
    isFormOpen: false,
    isDeleteOpen: false,
    isAlertOpen: false,
    columns: ["Hostname", "Model", "Rack", "Elevation", "Owner", "Comment"],
    fields: ["hostname", "model", "rack", "elevation", "owner", "comment"]
  };
  private updateAsset = (
    asset: AssetObject,
    headers: any
  ): Promise<any> => {
    let params: any;
    params = this.props.match.params;
    return axios
      .post(API_ROOT + "api/assets/modify", asset, headers)
      .then(res => {
        console.log("success");
        getData(params.rid, this.props.token).then(result => {
          this.setState({
            asset: result
          });
        });
        console.log(this.state.asset);
        this.handleFormClose();
        console.log(this.state.isFormOpen);
      });
  };

  private addToast(toast: IToastProps) {
    toast.timeout = 5000;
    this.toaster.show(toast);
  }
  private toaster: Toaster = {} as Toaster;
  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref)
  };

  public render() {
    let params: any;
    params = this.props.match.params;
    if (this.state.asset === undefined) {
      getData(params.rid, this.props.token).then(result => {
        this.setState({
          asset: result
        });
      });
      console.log(this.state.asset);
    }

    return (
      <div className={Classes.DARK + " asset-view"}>
        <Toaster
          autoFocus={false}
          canEscapeKeyClear={true}
          position={Position.TOP}
          ref={this.refHandlers.toaster}
        />
        {this.props.isAdmin ? (
          <div className={"detail-buttons"}>
            <AnchorButton
              className="button-add"
              intent="primary"
              icon="edit"
              text="Edit"
              minimal
              onClick={() => this.handleFormOpen()}
            />
            <FormPopup
              isOpen={this.state.isFormOpen}
              initialValues={this.state.asset}
              type={FormTypes.MODIFY}
              elementName={ElementType.ASSET}
              handleClose={this.handleFormClose}
              submitForm={this.updateAsset}
            />
            <AnchorButton
              minimal
              className="button-add"
              intent="danger"
              icon="trash"
              text="Delete"
              onClick={this.handleDeleteOpen}
            />
            <Alert
              cancelButtonText="Cancel"
              confirmButtonText="Delete"
              intent="danger"
              isOpen={this.state.isDeleteOpen}
              onCancel={this.handleDeleteCancel}
              onConfirm={this.handleDelete}
            >
              <p>Are you sure you want to delete?</p>
            </Alert>
          </div>
        ) : null}
        <PropertiesView data={this.state.asset} {...this.state} />
      </div>
    );
  }

  private handleFormOpen = () => {
    this.setState({
      isFormOpen: true
    });
  };
  handleFormSubmit = () => {
    this.setState({
      isFormOpen: false
    });
  };

  private handleFormClose = () => this.setState({ isFormOpen: false });
  private handleDeleteCancel = () => this.setState({ isDeleteOpen: false });
  private handleDeleteOpen = () => this.setState({ isDeleteOpen: true });
  private handleDelete = () => {
    console.log(this.props.rid);
    const data = { id: this.state.asset!.id };

    axios
      .post(
        API_ROOT + "api/assets/delete",
        data,
        getHeaders(this.props.token)
      )
      .then(res => {
        this.setState({ isDeleteOpen: false });
        this.props.history.push("/");
      })
      .catch(err => {
        console.log("ERROR", err);
        this.addToast({
          message: err.response.data.failure_message,
          intent: Intent.DANGER
        });
      });
  };
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin
  };
};

export default withRouter(connect(mapStatetoProps)(AssetView));
