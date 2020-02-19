import {
  Alert,
  AnchorButton,
  Classes,
  Tab,
  Tabs,
  IToastProps,
  Toaster,
  Intent,
  Position
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../../../utils/api-config";
import FormPopup from "../../../../forms/formPopup";

import ElementTable from "../../elementTable";
import {
  ElementType,
  AssetObject,
  ModelObject,
  getHeaders
} from "../../../../utils/utils";
import PropertiesView from "../propertiesView";
import { FormTypes } from "../../../../forms/formUtils";
import { modifyModel, deleteModel } from "../../elementUtils";

export interface ModelViewProps {
  token: string;
  rid: any;
  isAdmin: boolean;
}

// var console: any = {};
// console.log = function () { };
interface ModelViewState {
  assets: Array<AssetObject>;
  model: ModelObject;
  isFormOpen: boolean;
  isDeleteOpen: boolean;
}

async function getData(modelkey: string, token: string) {
  console.log(API_ROOT + "api/models/" + modelkey);
  const headers = {
    headers: {
      Authorization: "Token " + token
    }
  };
  return await axios
    .get(API_ROOT + "api/models/" + modelkey, headers)
    .then(res => {
      const data = res.data;
      return data;
    });
}

export class ModelView extends React.PureComponent<
  RouteComponentProps & ModelViewProps,
  ModelViewState
> {
  public state: ModelViewState = {
    assets: [],
    model: {} as ModelObject,
    isFormOpen: false,
    isDeleteOpen: false
  };

  private updateModel = (model: ModelObject, headers: any): Promise<any> => {
    return modifyModel(model, headers).then(res => {
      console.log("success");
      let params: any;
      params = this.props.match.params;
      getData(params.rid, this.props.token).then(result => {
        console.log("result", result);
        this.setState({
          model: result.model,
          assets: result.assets
        });
      });
      this.handleFormClose();
      console.log(this.state.isFormOpen);
    });
  };
  private handleDeleteOpen = () => this.setState({ isDeleteOpen: true });
  private handleDeleteCancel = () => this.setState({ isDeleteOpen: false });
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
  private addToast(toast: IToastProps) {
    toast.timeout = 5000;
    this.toaster.show(toast);
  }
  private toaster: Toaster = {} as Toaster;
  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref)
  };

  private handleFormClose = () => this.setState({ isFormOpen: false });
  private handleDelete = () => {
    deleteModel(this.state.model!, getHeaders(this.props.token))
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
        this.handleDeleteCancel();
      });
  };

  public render() {
    console.log(this.state.assets);
    let params: any;
    params = this.props.match.params;
    if (this.state.model === undefined) {
      getData(params.rid, this.props.token).then(result => {
        console.log("result", result);
        this.setState({
          model: result.model,
          assets: result.assets
        });
      });
    }

    var data = this.state.model;
    return (
      <div className={Classes.DARK + " model-view"}>
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
              initialValues={this.state.model}
              type={FormTypes.MODIFY}
              elementName={ElementType.MODEL}
              handleClose={this.handleFormClose}
              submitForm={this.updateModel}
            />
            <AnchorButton
              className="button-add"
              intent="danger"
              icon="trash"
              text="Delete"
              minimal
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
        <Tabs
          id="ModelViewer"
          animate={true}
          large
          renderActiveTabPanelOnly={false}
        >
          <Tab
            id="ModelProperties"
            title="Properties"
            panel={<PropertiesView data={data} />}
          />
          <Tab
            id="Assets"
            title="Assets"
            panel={
              <ElementTable
                type={ElementType.ASSET}
                data={this.state.assets}
                disableFiltering={true}
                disableSorting={true}
              />
            }
          />
          <Tabs.Expander />
        </Tabs>
      </div>
    );
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin
  };
};

export default withRouter(connect(mapStatetoProps)(ModelView));
