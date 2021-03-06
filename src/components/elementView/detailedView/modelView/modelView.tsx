import {
  Alert,
  AnchorButton,
  Classes,
  Intent,
  IToastProps,
  Position,
  Toaster,
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
  ChangePlan,
  TableType,
} from "../../../../utils/utils";
import ElementTable from "../../elementTable";
import { deleteModel, modifyModel } from "../../elementUtils";
import PropertiesView from "../propertiesView";
import { PermissionState } from "../../../../utils/permissionUtils";
import * as actions from "../../../../store/actions/state";

export interface ModelViewProps {
  token: string;
  rid: any;
  isAdmin: boolean;
  changePlan: ChangePlan;
  permissionState: PermissionState;
  markTablesStale(staleTables: TableType[]): void;
}

var console: any = {};
console.log = function () {};
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
  const params: any = {};
  if (changePlan) {
    params["change_plan"] = changePlan.id;
  }
  const config = {
    headers: {
      Authorization: "Token " + token,
    },
    params,
  };

  return await axios
    .get(API_ROOT + "api/models/" + modelkey, config)
    .then((res) => {
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
    isDeleteOpen: false,
  };

  private updateModel = (model: ModelObject, headers: any): Promise<any> => {
    return modifyModel(model, headers).then((res) => {
      let params: any;
      params = this.props.match.params;
      getData(params.rid, this.props.token, this.props.changePlan).then(
        (result) => {
          this.setState({
            model: result.model,
            assets: result.assets,
          });
        }
      );
      this.handleFormClose();
      this.props.markTablesStale([
        TableType.RACKED_ASSETS,
        TableType.STORED_ASSETS,
        TableType.MODELS,
      ]);
    });
  };
  private handleDeleteOpen = () => this.setState({ isDeleteOpen: true });
  private handleDeleteCancel = () => this.setState({ isDeleteOpen: false });
  private handleFormOpen = () => {
    this.setState({
      isFormOpen: true,
    });
  };
  handleFormSubmit = () => {
    this.setState({
      isFormOpen: false,
    });
  };
  private toaster: Toaster = {} as Toaster;
  private addToast(toast: IToastProps) {
    toast.timeout = 5000;
    this.toaster.show(toast);
  }

  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref),
  };

  private handleFormClose = () => this.setState({ isFormOpen: false });
  private handleDelete = () => {
    deleteModel(this.state.model!, getHeaders(this.props.token))
      .then((res) => {
        this.setState({ isDeleteOpen: false });
        this.addToast({
          message: "Succesfully Deleted Model",
          intent: Intent.PRIMARY,
        });
        this.props.history.push(ROUTES.DASHBOARD);
        this.props.markTablesStale([TableType.MODELS]);
      })
      .catch((err) => {
        this.addToast({
          message: err.response.data.failure_message,
          intent: Intent.DANGER,
        });
        this.handleDeleteCancel();
      });
  };

  componentWillReceiveProps(nextProps: ModelViewProps & RouteComponentProps) {
    if (nextProps.changePlan !== this.props.changePlan) {
      let params: any;
      params = this.props.match.params;

      getData(params.rid, this.props.token, nextProps.changePlan).then(
        (result) => {
          this.setState({
            model: result.model,
            assets: result.assets,
          });
        }
      );
    }
  }
  public render() {
    let params: any;
    params = this.props.match.params;
    if (Object.keys(this.state.model).length === 0) {
      getData(params.rid, this.props.token, this.props.changePlan).then(
        (result) => {
          this.setState({
            model: result.model,
            assets: result.assets,
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
        <div className="detail-buttons-wrapper">
          <div className={"detail-buttons"}>
            <AnchorButton
              className="button-add"
              intent="primary"
              icon="edit"
              text="Edit"
              minimal
              onClick={() => this.handleFormOpen()}
              disabled={
                !(
                  this.props.permissionState.admin ||
                  this.props.permissionState.model_management
                )
              }
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
              disabled={
                !(
                  this.props.permissionState.admin ||
                  this.props.permissionState.model_management
                )
              }
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
    changePlan: state.changePlan,
    permissionState: state.permissionState,
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    markTablesStale: (staleTables: TableType[]) =>
      dispatch(actions.markTablesStale(staleTables)),
  };
};

export default withRouter(
  connect(mapStatetoProps, mapDispatchToProps)(ModelView)
);
