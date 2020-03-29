import { RouteComponentProps } from "react-router";
import { connect } from "react-redux";
import * as React from "react";
import {
  Classes,
  AnchorButton,
  Pre,
  Collapse,
  Callout,
  Toaster,
  IToastProps,
  Intent,
  Spinner
} from "@blueprintjs/core";
import { withRouter } from "react-router-dom";
import "./changePlanner.scss";
import {
  AssetCPObject,
  AssetObject,
  ChangePlan,
  getHeaders,
  ROUTES,
  AssetFieldsTable,
  getChangePlanRowStyle,
  isObject,
  isAssetObject,
  isModelObject,
  ModelFieldsTable,
  isRackObject
} from "../../utils/utils";
import axios from "axios";
import { API_ROOT } from "../../utils/api-config";
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

  toggleCollapse(index: number) {
    const isOpen = this.state.isOpen;
    isOpen[index] = !isOpen[index];
    this.setState({
      isOpen
    });
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
  renderAssetData(asset: AssetObject | AssetCPObject) {
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
                <td className="label" key={col}>
                  {AssetFieldsTable[col]}:
                </td>

                <td>{value.row_letter + "" + value.rack_num}</td>
              </tr>,
              <tr>
                <td className="label" key={"datacenter"}>
                  {AssetFieldsTable["rack__datacenter__name"]}:
                </td>

                <td>{value.datacenter.name}</td>
              </tr>
            ];
          } else if (col === "comment") {
            field = <td className="comment">{value}</td>;
          } else if (!isObject(value)) {
            field = <td>{value}</td>;
          }

          return AssetFieldsTable[col] ? (
            <tr>
              <td className="label" key={col}>
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
            {this.state.modifications.length > 0
              ? this.state.modifications.map(
                  (modification: Modification, index: number) => {
                    return (
                      <li>
                        <Callout
                          className="change-plan-item"
                          onClick={e => this.toggleCollapse(index)}
                        >
                          {modification.title}
                        </Callout>
                        <Collapse isOpen={this.state.isOpen[index]}>
                          {modification.asset ? (
                            <div className="cp-details">
                              <Pre>
                                <h3>Live Asset </h3>
                                {this.renderAssetData(modification.asset)}
                              </Pre>
                              <Pre>
                                <h3>Change Plan Asset</h3>
                                {modification.asset_cp
                                  ? this.renderAssetData(modification.asset_cp)
                                  : null}
                              </Pre>
                            </div>
                          ) : (
                            <Pre>
                              {modification.asset_cp
                                ? this.renderAssetData(modification.asset_cp)
                                : null}
                            </Pre>
                          )}
                        </Collapse>
                      </li>
                    );
                  }
                )
              : null}
          </ul>
        </div>

        <AnchorButton intent="primary" icon="build" text="Execute Work Order" />
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
