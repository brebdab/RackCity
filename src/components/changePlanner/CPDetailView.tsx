import {
  AnchorButton,
  Callout,
  Classes,
  Collapse,
  Intent,
  IToastProps,
  Pre,
  Spinner,
  Toaster,
  Position
} from "@blueprintjs/core";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router";
import { withRouter } from "react-router-dom";
import { API_ROOT } from "../../utils/api-config";
import {
  AssetCPObject,
  AssetFieldsTable,
  AssetObject,
  ChangePlan,
  getHeaders,
  isModelObject,
  isObject,
  isRackObject,
  ROUTES
} from "../../utils/utils";
import "./changePlanner.scss";
interface CPDetailViewProps {
  token: string;
}
enum ModificationType {
  MODIFY = "Modify",
  CREATE = "Create",
  DECOMMISSION = "Decommission"
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
  changePlan: ChangePlan;
  modifications: Array<Modification>;
}

function getChangePlanDetail(token: string, id: string) {
  console.log("getting change plan detail");
  return axios.get(API_ROOT + "api/change-plans/" + id, getHeaders(token));
}
class CPDetailView extends React.Component<
  CPDetailViewProps & RouteComponentProps,
  CPDetailViewState
  > {
  route_id = (this.props.match.params as any).id;
  loading = false;
  items = ["a", "b"];
  dataLoaded = false;

  getConflictWarning = () => {
    return <div></div>;
  };
  public state = {
    isOpen: [false, false],
    changePlan: {} as ChangePlan,
    modifications: []
  };
  disableExecute() {
    if (this.loading) {
      return true;
    }

    let conflict = false;
    this.state.modifications.forEach((modification: Modification) => {
      if (modification.conflicts && modification.conflicts.length > 0) {
        conflict = true;
      }
    });

    return conflict;
  }
  removeModification(modification: Modification) {
    axios
      .post(
        API_ROOT +
        "api/change-plans/" +
        this.state.changePlan.id +
        "/remove-asset",
        { asset_cp: modification.asset_cp.id },
        getHeaders(this.props.token)
      )
      .then(res => {
        this.addSuccessToast(res.data.success_message);

        const modifications: Array<Modification> = this.state.modifications.slice();
        const index = modifications.indexOf(modification);
        modifications.splice(index, 1);
        console.log(modifications, index);
        const isOpen = this.state.isOpen;
        isOpen.splice(index, 1);

        this.setState({
          modifications,
          isOpen
        });
      })
      .catch(err => {
        this.addErrorToast(err.response.data.failure_message);
      });
  }

  resolveConflict(
    modification: Modification,
    conflict: Conflict,
    override_live: boolean
  ) {
    axios
      .post(
        API_ROOT +
        "api/change-plans/" +
        this.state.changePlan.id +
        "/resolve-conflict",
        { asset_cp: modification.asset_cp.id, override_live },
        getHeaders(this.props.token)
      )
      .then(res => {
        this.addSuccessToast(res.data.success_message);

        const modifications: Array<Modification> = this.state.modifications.slice();
        const index = modifications.indexOf(modification);
        if (override_live) {
          modification.conflicts.splice(
            modification.conflicts.indexOf(conflict),
            1
          );

          modifications[index] = modification;
        } else {
          modifications.splice(index, 1);
          const isOpen = this.state.isOpen;
          isOpen.splice(index, 1);
          this.setState({
            isOpen
          });
        }
        this.setState({
          modifications
        });
      })
      .catch(err => {
        this.addErrorToast(err.response.data.failure_message);
      });
  }

  handleExecute() {
    axios
      .post(
        API_ROOT +
        "/api/change-plans/" +
        this.state.changePlan.id +
        "/execute",
        getHeaders(this.props.token)
      )
      .then(res => {
        this.addSuccessToast(res.data.success_message);
      })
      .catch(err => {
        this.addErrorToast(err.response.data.failure_message);
      });
  }

  toggleCollapse(index: number) {
    const isOpen = this.state.isOpen;
    isOpen[index] = !isOpen[index];
    this.setState({
      isOpen
    });
  }
  getHighlightStyle(modification: Modification, col: string) {
    const highlight =
      modification.changes && modification.changes.includes(col);

    return {
      fontWeight: highlight ? ("bold" as any) : ("normal" as any),
      color: highlight ? "#bf8c0a" : "white"
    };
  }
  private toaster: Toaster = {} as Toaster;
  private addToast(toast: IToastProps) {
    toast.timeout = 5000;
    this.toaster.show(toast);
  }

  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref)
  };

  private addSuccessToast = (message: string) => {
    this.addToast({ message: message, intent: Intent.PRIMARY });
  };
  private addWarnToast = (message: string) => {
    this.addToast({
      message: message,
      intent: Intent.WARNING
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
                onClick={e =>
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

                <td>{value.row_letter + "" + value.rack_num}</td>
              </tr>,
              <tr>
                <td
                  style={this.getHighlightStyle(modification, col)}
                  key={"datacenter"}
                >
                  {AssetFieldsTable["rack__datacenter__name"]}:
                </td>

                <td style={this.getHighlightStyle(modification, col)}>
                  {value.datacenter.name}
                </td>
              </tr>
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
          } else if (!isObject(value)) {
            field = (
              <td style={this.getHighlightStyle(modification, col)}>{value}</td>
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
        .then(res => {
          this.loading = false;
          this.dataLoaded = true;
          this.setState({
            changePlan: res.data.change_plan,
            modifications: res.data.modifications
          });
        })
        .catch(err => {
          this.loading = false;
          this.addErrorToast(err.response.data.failure_message);
        });
    }
  }
  public render() {
    console.log(this.props.match);
    if (!this.dataLoaded && this.route_id) {
      this.loading = true;
      getChangePlanDetail(this.props.token, this.route_id)
        .then(res => {
          this.loading = false;
          this.dataLoaded = true;
          this.setState({
            changePlan: res.data.change_plan,
            modifications: res.data.modifications
          });
        })
        .catch(err => {
          this.loading = false;
          this.addErrorToast(err.response.data.failure_message);
        });
    }
    return (
      <div className={Classes.DARK + " asset-view"}>
        <Toaster
          autoFocus={false}
          canEscapeKeyClear={true}
          position={Position.TOP}
          ref={this.refHandlers.toaster}
        />
        <h1>Change Plan</h1>
        <div className="detail-buttons-wrapper">
          <div className={"detail-buttons"}>
            <AnchorButton
              minimal
              intent="primary"
              icon="document-open"
              text="Generate Work Order"
            />
          </div>
          {this.loading ? <Spinner /> : null}

          <ul className="bp3-list-unstyled">
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
                        onClick={e => this.toggleCollapse(index)}
                      >
                        {modification.title}
                        <AnchorButton
                          className="cp-remove"
                          intent={Intent.DANGER}
                          minimal
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
                            ? modification.conflicts.map(
                              (conflict: Conflict) => {
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
                              }
                            )
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
                          {modification.asset ? (
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
            ) : (
                <Callout title="No modifications for this change plan"> </Callout>
              )}
          </ul>
        </div>

        <AnchorButton
          disabled={this.disableExecute()}
          icon="build"
          text="Execute Work Order"
          onClick={() => this.handleExecute()}
        />
      </div>
    );
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token
  };
};

export default withRouter(connect(mapStatetoProps)(CPDetailView));
