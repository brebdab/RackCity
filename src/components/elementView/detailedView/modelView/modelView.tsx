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
  ModelObjectOld,
  getHeaders,
  getFields
} from "../../../../utils/utils";
import PropertiesView from "../propertiesView";
import { FormTypes } from "../../../../forms/formUtils";

export interface ModelViewProps {
  token: string;
  rid: any;
  isAdmin: boolean;
}

var console: any = {};
console.log = function() {};
interface ModelViewState {
  assets: Array<AssetObject> | undefined;
  model: ModelObjectOld | undefined;
  columns: Array<string>;
  fields: Array<string>;
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
    assets: undefined,
    model: undefined,
    isFormOpen: false,
    isDeleteOpen: false,
    columns: [
      "Model #",
      "CPU",
      "Height",
      "Display Color",
      "Memory (GB)",
      "# Ethernet Ports",
      "# Power Ports",
      "Storage",
      "Vendor",
      "Comment"
    ],
    fields: [
      "model_number",
      "cpu",
      "height",
      "display_color",
      "memory_gb",
      "num_ethernet_ports",
      "num_power_ports",
      "storage",
      "vendor",
      "comment"
    ]
  };

  private updateModel = (model: ModelObjectOld, headers: any): Promise<any> => {
    return axios
      .post(API_ROOT + "api/models/modify", model, headers)
      .then(res => {
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

  private handleDeleteCancel = () => this.setState({ isDeleteOpen: false });
  private handleFormClose = () => this.setState({ isFormOpen: false });
  private handleDelete = () => {
    const data = { id: this.state.model!.id };
    axios
      .post(API_ROOT + "api/models/delete", data, getHeaders(this.props.token))
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

  componentDidMount() {
    const auth = getHeaders(this.props.token);
    const headers = {
      headers: auth.headers,
      params: {
        page: 1,
        page_size: 20
      }
    };
    getFields("models", headers).then((res: any) => {
      this.setState({
        fields: res,
        columns: res
      });
    });
  }

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
            panel={<PropertiesView data={data} {...this.state} />}
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
