import {
  Alert,
  AnchorButton,
  Classes,
  Intent,
  IToastProps,
  Position,
  Toaster
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import FormPopup from "../../../../forms/formPopup";
import { FormTypes } from "../../../../forms/formUtils";
import { API_ROOT } from "../../../../utils/api-config";
import {
  AssetObject,
  ElementType,
  getHeaders,
  ModelObject,
  ROUTES,
  ChangePlan
} from "../../../../utils/utils";
import ElementTable from "../../elementTable";
import { deleteModel, modifyModel } from "../../elementUtils";
import PropertiesView from "../propertiesView";

export interface ModelViewProps {
  token: string;
  rid: any;
  isAdmin: boolean;
  changePlan: ChangePlan;
}


// var console: any = {};
// console.log = function() {};
interface ModelViewState {
  assets: Array<AssetObject>;
  model: ModelObject;
  isFormOpen: boolean;
  isDeleteOpen: boolean;
}

async function getData(
  modelkey: string,
  token: string,
  changePlan: ChangePlan
) {
  console.log(API_ROOT + "api/models/" + modelkey);
  const params: any = {};
  if (changePlan) {
    params["change_plan"] = changePlan.id;
  }
  const config = {
    headers: {
      Authorization: "Token " + token
    },
    params
  };
  console.log(config);
  return await axios
    .get(API_ROOT + "api/models/" + modelkey, config)
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
      getData(params.rid, this.props.token, this.props.changePlan).then(
        result => {
          console.log("result", result);
          this.setState({
            model: result.model,
            assets: result.assets
          });
        }
      );
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
  private toaster: Toaster = {} as Toaster;
  private addToast(toast: IToastProps) {
    toast.timeout = 5000;
    this.toaster.show(toast);
  }

  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref)
  };

  private handleFormClose = () => this.setState({ isFormOpen: false });
  private handleDelete = () => {
    deleteModel(this.state.model!, getHeaders(this.props.token))
      .then(res => {
        this.setState({ isDeleteOpen: false });
        this.addToast({
          message: "Succesfully Deleted Model",
          intent: Intent.PRIMARY
        });
        this.props.history.push(ROUTES.DASHBOARD);
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

  componentWillReceiveProps(nextProps: ModelViewProps & RouteComponentProps) {
    console.log("new change plan", nextProps.changePlan);
    if (nextProps.changePlan !== this.props.changePlan) {
      let params: any;
      params = this.props.match.params;
      console.log("new change plan", nextProps.changePlan);
      getData(params.rid, this.props.token, nextProps.changePlan).then(
        result => {
          console.log("result", result);
          this.setState({
            model: result.model,
            assets: result.assets
          });
        }
      );
    }
  }
  public render() {
    console.log(this.state.assets);
    let params: any;
    params = this.props.match.params;
    if (Object.keys(this.state.model).length === 0) {
      getData(params.rid, this.props.token, this.props.changePlan).then(
        result => {
          console.log("result", result);
          this.setState({
            model: result.model,
            assets: result.assets
          });
        }
      );
    }

    return (
      <div className={Classes.DARK + " model-view"}>
        <Toaster
          autoFocus={false}
          canEscapeKeyClear={true}
          position={Position.TOP}
          ref={this.refHandlers.toaster}
        />
        {this.props.isAdmin ? (
          <div className="detail-buttons-wrapper">
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
                className={Classes.DARK}
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
          </div>
        ) : null}

        <PropertiesView data={this.state.model} />
        <div className="propsview">
          <h3>Assets</h3>
          <ElementTable
            type={ElementType.ASSET}
            data={this.state.assets}
            disableFiltering={true}
            disableSorting={true}
            isDecommissioned={false}
          />
        </div>
      </div>
    );
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin,
    changePlan: state.changePlan
  };
};

export default withRouter(connect(mapStatetoProps)(ModelView));
