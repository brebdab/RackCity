import {
  Alert,
  AnchorButton,
  Callout,
  Classes,
  Collapse,
  Divider,
  Intent,
  IToastProps,
  Position,
  Pre,
  Spinner,
  Toaster,
  Checkbox,
} from "@blueprintjs/core";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router";
import { withRouter } from "react-router-dom";
import { isNullOrUndefined } from "util";
import * as actions from "../../store/actions/state";
import { API_ROOT } from "../../utils/api-config";
import {
  AssetCPObject,
  AssetFieldsTable,
  AssetObject,
  ChangePlan,
  getHeaders, isAssetObject,
  isDatacenterObject,
  isModelObject,
  isObject,
  isRackObject,
  ROUTES,
  TableType,
} from "../../utils/utils";
import "./changePlanner.scss";
interface CPDetailViewProps {
  token: string;
  updateChangePlans(status: boolean): void;
  setChangePlan(changePlan: ChangePlan | null): void;
  markTablesStale(staleTables: TableType[]): void;
}
enum ModificationType {
  MODIFY = "Modify",
  CREATE = "Create",
  DECOMMISSION = "Decommission",
}

interface Conflict {
  conflict_message: string;
  conflicting_asset: string;
  conflict_resolvable: boolean;
}
interface Modification {
  title: string;
  asset_cp: AssetCPObject;
  type: ModificationType;
  asset: AssetObject;
  changes: Array<string>;
  conflicts: Array<Conflict>;
}
interface CPDetailViewState {
  isOpen: Array<boolean>;
  isAlertOpen: boolean;
  changePlan: ChangePlan;
  modifications: Array<Modification>;
  username: string;
  disableButtons: boolean;
}

function getChangePlanDetail(token: string, id: string) {
  return axios.get(API_ROOT + "api/change-plans/" + id, getHeaders(token));
}
class CPDetailView extends React.Component<
  CPDetailViewProps & RouteComponentProps,
  CPDetailViewState
> {
  route_id = (this.props.match.params as any).id;
  loading = false;

  dataLoaded = false;
  openPrint = false;
  public state = {
    isOpen: [] as Array<boolean>,
    changePlan: {} as ChangePlan,
    modifications: [],
    isAlertOpen: false,
    username: "",
    disableButtons: true,
  };
  printWorkOrder = () => {
    this.getUsername(this.props.token);
    const isOpen = this.state.isOpen.map(() => {
      return true;
    });
    this.setState({
      isOpen,
    });
    this.openPrint = true;
  };

  setButtonState() {
    if (
      this.loading ||
      this.state.modifications.length === 0 ||
      !isNullOrUndefined(this.state.changePlan.execution_time)
    ) {
      this.setState({
        disableButtons: true,
      });
      return;
    }

    this.state.modifications.forEach((modification: Modification) => {
      if (modification.conflicts && modification.conflicts.length > 0) {
        this.setState({
          disableButtons: true,
        });
        return;
      }
    });
    this.setState({
      disableButtons: false,
    });
  }
  removeModification(modification: Modification) {
    this.loading = true;
    axios
      .post(
        API_ROOT +
          "api/change-plans/" +
          this.state.changePlan.id +
          "/remove-asset",
        { asset_cp: modification.asset_cp.id },
        getHeaders(this.props.token)
      )
      .then((res) => {
            this.loading = false;
        this.addSuccessToast(res.data.success_message);
        this.updateData();
        this.props.markTablesStale([
          TableType.RACKED_ASSETS,
          TableType.STORED_ASSETS,
          TableType.DECOMMISSIONED_ASSETS,
        ]);
        this.setButtonState();
      })
      .catch((err) => {
              this.loading = false;
        this.addErrorToast(err.response.data.failure_message);
      });
  }
  updateData() {
    this.loading = true;
    getChangePlanDetail(this.props.token, this.route_id)
      .then((res) => {
        this.loading = false;
        this.dataLoaded = true;
        const changePlan: ChangePlan = res.data.change_plan;
        if (isNullOrUndefined(changePlan.execution_time)) {
          this.props.setChangePlan(changePlan);
        } else {
          this.props.setChangePlan(null);
        }
        const isOpen = new Array(res.data.modifications.length).fill(false);
        this.setState({
          changePlan: res.data.change_plan,
          modifications: res.data.modifications,
          isOpen,
        });
      })
      .catch((err) => {
        this.loading = false;
        this.addErrorToast(err.response.data.failure_message);
      });
  }

  resolveConflict(
    modification: Modification,
    conflict: Conflict,
    override_live: boolean
  ) {
        this.loading = true;
    axios
      .post(
        API_ROOT +
          "api/change-plans/" +
          this.state.changePlan.id +
          "/resolve-conflict",
        { asset_cp: modification.asset_cp.id, override_live },
        getHeaders(this.props.token)
      )
      .then((res) => {
            this.loading = false;
        this.addSuccessToast(res.data.success_message);
        this.updateData();
        this.props.markTablesStale([
          TableType.RACKED_ASSETS,
          TableType.STORED_ASSETS,
        ]);
        this.setButtonState();
      })
      .catch((err) => {
            this.loading = false;
        this.addErrorToast(err.response.data.failure_message);
      });
  }
  handleExecuteCancel() {
    this.setState({
      isAlertOpen: false,
    });
  }
  handleExecute() {
        this.loading = true;
    axios
      .post(
        API_ROOT + "api/change-plans/" + this.state.changePlan.id + "/execute",
        {},
        getHeaders(this.props.token)
      )
      .then((res) => {
          this.loading = false;
        this.props.updateChangePlans(true);
        this.addSuccessToast(res.data.success_message);
        this.setState({
          isAlertOpen: false,
        });
        this.setState({
          disableButtons: true,
        });

        this.updateData();
        this.props.markTablesStale([
          TableType.RACKED_ASSETS,
          TableType.STORED_ASSETS,
          TableType.DECOMMISSIONED_ASSETS,
        ]);
      })
      .catch((err) => {
            this.loading = false;
        this.addErrorToast(err.response.data.failure_message);
        this.setState({
          isAlertOpen: false,
        });
      });
  }

  toggleCollapse(index: number) {
    const isOpen = this.state.isOpen;
    isOpen[index] = !isOpen[index];
    this.setState({
      isOpen,
    });
  }
  getHighlightStyle(modification: Modification, col: string) {
    const highlight =
      modification.changes && modification.changes.includes(col);

    return {
      fontWeight: highlight ? ("bold" as any) : ("normal" as any),
      color: highlight ? "#bf8c0a" : "white",
    };
  }
  private toaster: Toaster = {} as Toaster;
  private addToast(toast: IToastProps) {
    toast.timeout = 5000;
    this.toaster.show(toast);
  }

  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref),
  };

  private addSuccessToast = (message: string) => {
    this.addToast({ message: message, intent: Intent.PRIMARY });
  };
  private addWarnToast = (message: string) => {
    this.addToast({
      message: message,
      intent: Intent.WARNING,
    });
  };
  private addErrorToast = (message: string) => {
    this.addToast({ message: message, intent: Intent.DANGER });
  };
  renderAssetData(
    asset: AssetObject | AssetCPObject,
    modification: Modification
  ) {
    return (
      <table>
        {Object.entries(asset).map(([col, value]) => {
          let field;
          if (col === "network_ports" && value) {
            const network_ports: Array<string> = value;
            field = <td> {network_ports.toString()}</td>;
          } else if (isModelObject(value)) {
            field = (
              <td
                style={this.getHighlightStyle(modification, col)}
                className="clickable"
                onClick={(e) =>
                  this.props.history.push(ROUTES.MODELS + "/" + value.id)
                }
              >
                {value.vendor + " " + value.model_number}
              </td>
            );
          } else if (isRackObject(value)) {
            return [
              <tr>
                <td style={this.getHighlightStyle(modification, col)} key={col}>
                  {AssetFieldsTable[col]}:
                </td>

                <td style={this.getHighlightStyle(modification, col)}>
                  {value.row_letter + "" + value.rack_num}
                </td>
              </tr>,
            ];
          } else if (col === "comment") {
            field = (
              <td
                style={this.getHighlightStyle(modification, col)}
                className="comment"
              >
                {value}
              </td>
            );
          } else if (isDatacenterObject(value)) {
            field = (
              <td style={this.getHighlightStyle(modification, col)}>
                {value.name}
              </td>
            );
          } else if (isAssetObject(value)){
                        field = (
              <td style={this.getHighlightStyle(modification, col)}>
                {value.hostname}
              </td>
            );

          }


          else if (!isObject(value)) {
            field = (
              <td style={this.getHighlightStyle(modification, col)}>{value}</td>
            );
          } else if (col === "network_connections") {
            return (
              <tr>
                <td style={this.getHighlightStyle(modification, col)} key={col}>
                  Network Connections
                </td>
                <td style={this.getHighlightStyle(modification, col)}>
                  <pre>{JSON.stringify(value, null, 2)}</pre>
                </td>
              </tr>
            );
          } else if (col === "power_connections") {
            return (
              <tr>
                <td style={this.getHighlightStyle(modification, col)} key={col}>
                  Power Connections
                </td>
                <td style={this.getHighlightStyle(modification, col)}>
                  <pre>{JSON.stringify(value, null, 2)}</pre>
                </td>
              </tr>
            );
          }

          return AssetFieldsTable[col] ? (
            <tr>
              <td
                style={this.getHighlightStyle(modification, col)}
                // className="label"
                key={col}
              >
                {AssetFieldsTable[col]}:
              </td>

              {field}
            </tr>
          ) : null;
        })}
      </table>
    );
  }
  componentDidMount() {
    if (!this.dataLoaded && this.route_id) {
      this.loading = true;
      getChangePlanDetail(this.props.token, this.route_id)
        .then((res) => {
          this.loading = false;
          this.dataLoaded = true;

          const changePlan: ChangePlan = res.data.change_plan;
          if (isNullOrUndefined(changePlan.execution_time)) {
            this.props.setChangePlan(changePlan);
          } else {
            this.props.setChangePlan(null);
          }
          this.setButtonState();
          const isOpen = new Array(res.data.modifications.length).fill(false);
          this.setState({
            changePlan: res.data.change_plan,
            modifications: res.data.modifications,
            isOpen,
          });
        })
        .catch((err) => {
          this.loading = false;
          this.addErrorToast(err.response.data.failure_message);
        });
    }
  }
  getUsername(token: string) {
    const headers = {
      headers: {
        Authorization: "Token " + token,
      },
    };
    axios
      .get(API_ROOT + "api/users/who-am-i", headers)
      .then((res) => {
        this.setState({ username: res.data.username });
      })
      .catch((err) => {});
  }
  public render() {
    if (
      this.openPrint &&
      this.state.isOpen.every((item: boolean) => item === true)
    ) {
      this.openPrint = false;
      setTimeout(() => {
        window.print();
      }, 1000);
    }
    if (!this.dataLoaded && this.route_id) {
      this.loading = true;
      getChangePlanDetail(this.props.token, this.route_id)
        .then((res) => {
          this.loading = false;
          this.dataLoaded = true;
          const changePlan: ChangePlan = res.data.change_plan;
          if (isNullOrUndefined(changePlan.execution_time)) {
            this.props.setChangePlan(changePlan);
          } else {
            this.props.setChangePlan(null);
          }
          this.setButtonState();
          const isOpen = new Array(res.data.modifications.length).fill(false);
          this.setState({
            changePlan: res.data.change_plan,
            modifications: res.data.modifications,
            isOpen,
          });
        })
        .catch((err) => {

          this.loading = false;
          this.addErrorToast(err.response.data.failure_message);
        });
    }
    return (
      <div className={Classes.DARK + " asset-view"}>
        <Alert
          cancelButtonText="Cancel"
          confirmButtonText="Execute"
          intent={Intent.WARNING}
          className={Classes.DARK}
          isOpen={this.state.isAlertOpen}
          onCancel={() => this.handleExecuteCancel()}
          onConfirm={() => this.handleExecute()}
        >
          <p>
            Are you sure you want to execute this change plan? You will not be
            able to generate a work order for this change plan anymore.
          </p>
        </Alert>
        <Toaster
          autoFocus={false}
          canEscapeKeyClear={true}
          position={Position.TOP}
          ref={this.refHandlers.toaster}
        />
        <h1 className={Classes.DARK}>
          Change Plan:{" "}
          {this.state.changePlan ? this.state.changePlan.name : null}
        </h1>

        {this.loading ? <Spinner /> : null}
        <ul className="bp3-list-unstyled">
          <Callout className="print" intent="primary">
            This work order was generated by user {this.state.username} on{" "}
            {new Date().toString()}
          </Callout>
          {this.state.changePlan && this.state.changePlan.execution_time ? (
            <Callout intent="primary">
              This change plan was executed at:{" "}
              {this.state.changePlan.execution_time}
            </Callout>
          ) : null}
          {this.state.modifications.length > 0 ? (
            this.state.modifications.map(
              (modification: Modification, index: number) => {
                return (
                  <li>
                    <Callout
                      icon={null}
                      intent={
                        modification.conflicts &&
                        modification.conflicts.length > 0
                          ? Intent.DANGER
                          : Intent.NONE
                      }
                      className="change-plan-item"
                      onClick={(e) => this.toggleCollapse(index)}
                    >
                      <Checkbox className="print" />
                      {modification.title}
                      <AnchorButton
                        className="cp-remove"
                        intent={Intent.DANGER}
                        minimal
                        disabled={
                          !isNullOrUndefined(this.state.changePlan) &&
                          !isNullOrUndefined(
                            this.state.changePlan.execution_time
                          )
                        }
                        icon="delete"
                        onClick={(e: any) => {
                          this.removeModification(modification);
                          e.stopPropagation();
                        }}
                        text="Discard change"
                      />
                    </Callout>
                    <Collapse isOpen={this.state.isOpen[index]}>
                      <div className="cp-collapse-body">
                        {modification.conflicts
                          ? modification.conflicts.map((conflict: Conflict) => {
                              return (
                                <Callout intent={Intent.DANGER}>
                                  {conflict.conflict_message}
                                  {conflict.conflict_resolvable ? (
                                    <div className="merge-options">
                                      <AnchorButton
                                        onClick={() =>
                                          this.resolveConflict(
                                            modification,
                                            conflict,
                                            false
                                          )
                                        }
                                        icon="properties"
                                        text="Discard change plan modifications"
                                      />
                                      <AnchorButton
                                        onClick={() =>
                                          this.resolveConflict(
                                            modification,
                                            conflict,
                                            true
                                          )
                                        }
                                        icon="properties"
                                        text="Keep change plan modifications"
                                      />
                                    </div>
                                  ) : null}
                                </Callout>
                              );
                            })
                          : null}

                        <AnchorButton
                          className="asset-detail"
                          icon="properties"
                          onClick={(e: any) => {
                            this.props.history.push(
                              ROUTES.ASSETS + "/" + modification.asset_cp.id
                            );
                          }}
                          text="Go to change plan asset detail page"
                        />
                        {modification.asset &&
                        isNullOrUndefined(
                          this.state.changePlan.execution_time
                        ) ? (
                          <div className="cp-details">
                            <Pre>
                              <h3>Live Asset </h3>
                              {this.renderAssetData(
                                modification.asset,
                                modification
                              )}
                            </Pre>
                            <Pre>
                              <h3>Change Plan Asset</h3>
                              {modification.asset_cp
                                ? this.renderAssetData(
                                    modification.asset_cp,
                                    modification
                                  )
                                : null}
                            </Pre>
                          </div>
                        ) : (
                          <div className="cp-details">
                            <Pre>
                              <h3>Change Plan Asset</h3>
                              {modification.asset_cp
                                ? this.renderAssetData(
                                    modification.asset_cp,
                                    modification
                                  )
                                : null}
                            </Pre>
                          </div>
                        )}
                      </div>
                    </Collapse>
                  </li>
                );
              }
            )
          ) : this.loading ? null : (
            <Callout title="No modifications for this change plan"> </Callout>
          )}
        </ul>
        <div className="detail-buttons-wrapper">
          <div className={"detail-buttons-cp"}>
            <div>
              <AnchorButton
                onClick={() => this.printWorkOrder()}
                disabled={this.state.disableButtons}
                intent="none"
                icon="document-open"
                text="Generate Work Order"
              />
            </div>
            <div className="cp-dividers">
              <Divider className="cp-detail-divider" />
              <p className={Classes.DARK + " cp-detail-divider-text"}>then</p>
              <Divider className="cp-detail-divider" />
            </div>
            <div>
              <AnchorButton
                disabled={this.state.disableButtons}
                icon="build"
                intent="primary"
                text="Execute Change Plan"
                onClick={() =>
                  this.setState({
                    isAlertOpen: true,
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
  };
};
const mapDispatchToProps = (dispatch: any) => {
  return {
    logout: () => dispatch(actions.logout()),
    updateChangePlans: (status: boolean) =>
      dispatch(actions.updateChangePlans(status)),
    setChangePlan: (changePlan: ChangePlan) =>
      dispatch(actions.setChangePlan(changePlan)),
    markTablesStale: (staleTables: TableType[]) =>
      dispatch(actions.markTablesStale(staleTables)),
  };
};

export default withRouter(
  connect(mapStatetoProps, mapDispatchToProps)(CPDetailView)
);
