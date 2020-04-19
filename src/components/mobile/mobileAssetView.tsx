import { Callout, Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import { RouteComponentProps, withRouter } from "react-router";
import * as React from "react";
import {
  AssetObject,
  AssetFieldsTable,
  ModelFieldsTable,
  isAssetObject,
  getChangePlanRowStyle,
  isDatacenterObject,
  isObject,
  isModelObject,
  NetworkConnection,
  MountTypes,
} from "../../utils/utils";
import { BladePowerView } from "../elementView/powerView/bladePowerView";
import PowerView from "../elementView/powerView/powerView";
import { IconNames } from "@blueprintjs/icons";

interface MobileAssetViewProps {
  asset: AssetObject;
  data_override: any;
  token: string;
}

interface MobileAssetViewState {
  powerShouldUpdate: boolean;
}

export class MobileAssetView extends React.PureComponent<
  MobileAssetViewProps & RouteComponentProps
> {
  public state: MobileAssetViewState = {
    powerShouldUpdate: false,
  };

  renderData(fields: Array<any>, data: any) {
    return fields.map((item: string) => {
      var dat;
      if (item === "display_color") {
        const isCustomField =
          this.props.data_override && this.props.data_override[item];
        const color = isCustomField
          ? this.props.data_override[item]
          : data[item];

        dat = (
          <p
            className="color"
            style={{
              backgroundColor: color,
            }}
          >
            {color}
          </p>
        );
      } else if (item === "network_ports") {
        if (data[item]) {
          const network_ports: Array<string> = data[item];
          dat = <p>{network_ports.toString()}</p>;
        }
      } else if (item === "model") {
        dat = <p>{data[item].vendor + " " + data[item].model_number}</p>;
      } else if (isAssetObject(data) && item === "rack") {
        let rack = null;
        if (data.rack) {
          rack = data.rack;
        }
        if (data.chassis) {
          rack = data.chassis.rack;
        }
        return [
          <tr>
            <td key={item}>
              <p className="label">{AssetFieldsTable[item]}:</p>
            </td>

            <td style={getChangePlanRowStyle(data)}>
              {" "}
              <p>{rack ? rack.row_letter + "" + rack.rack_num : null}</p>
            </td>
          </tr>,
        ];
      } else if (isAssetObject(data) && item === "chassis") {
        return [
          <tr>
            <td key={item}>
              <p className="label">{AssetFieldsTable[item]}:</p>
            </td>

            <td style={getChangePlanRowStyle(data)}>
              {" "}
              <p>{data.chassis ? data.chassis.hostname : null}</p>
            </td>
          </tr>,
        ];
      } else if (item === "comment") {
        dat = <p className="comment">{data[item]}</p>;
      } else if (isDatacenterObject(data[item])) {
        dat = <p>{data[item].name}</p>;
      } else if (!isObject(data[item])) {
        //TO DO: decide how to render dicts
        dat = <p>{data[item]}</p>;
      }

      if (isAssetObject(data)) {
        return AssetFieldsTable[item] ? (
          <tr>
            <td key={item}>
              <p className="label">{AssetFieldsTable[item]}:</p>
            </td>

            <td style={getChangePlanRowStyle(data)}>{dat}</td>
          </tr>
        ) : null;
      }
      if (isModelObject(data)) {
        const isCustomField =
          this.props.data_override && this.props.data_override[item];
        return (
          <tr>
            <td key={item}>
              <p
                className="label"
                style={{
                  fontWeight: isCustomField
                    ? ("bold" as any)
                    : ("normal" as any),
                  color: isCustomField ? "#48AFF0" : "#bfccd6",
                }}
              >
                {ModelFieldsTable[item]}:
              </p>
            </td>

            {isCustomField && item !== "display_color" ? (
              <td>{this.props.data_override[item]}</td>
            ) : (
              <td style={getChangePlanRowStyle(data)}>{dat}</td>
            )}
          </tr>
        );
      } else {
        return (
          <tr>
            <td key={item}>
              <p className="label">{item}:</p>
            </td>

            <td>{dat}</td>
          </tr>
        );
      }
    });
  }

  getNetworkConnectionForPort(port: string) {
    return this.props.asset.network_connections.find(
      (connection: NetworkConnection) => connection.source_port === port
    );
  }

  private renderPower() {
    if (this.props.asset && this.props.asset.model) {
      if (this.props.asset.model.model_type === MountTypes.BLADE) {
        return (
          <BladePowerView
            {...this.props}
            token={this.props.token}
            isAdmin={false}
            isMobile={true}
            permissionState={{
              model_management: false,
              asset_management: false,
              power_control: false,
              audit_read: false,
              admin: false,
              site_permissions: [],
            }}
            asset={this.props.asset}
            shouldUpdate={this.state.powerShouldUpdate}
            updated={() => {
              this.setState({ powerShouldUpdate: false });
            }}
            assetIsDecommissioned={
              this.props.asset.decommissioning_user !== undefined
            }
          />
        );
      } else {
        return (
          <PowerView
            {...this.props}
            isMobile={true}
            asset={this.props.asset}
            shouldUpdate={this.state.powerShouldUpdate}
            updated={() => {
              this.setState({ powerShouldUpdate: false });
            }}
            assetIsDecommissioned={
              this.props.asset.decommissioning_user !== undefined
            }
          />
        );
      }
    } else {
      return;
    }
  }

  render() {
    console.log(this.props.asset);
    return (
      <div className={Classes.DARK}>
        <Callout title={"Asset Properties"} className={"propsview"}>
          <table className="bp3-html-table">
            {this.renderData(Object.keys(AssetFieldsTable), this.props.asset)}
          </table>
        </Callout>
        <Callout title={"Model Properties"} className={"propsview"}>
          <table className="bp3-html-table">
            {this.renderData(
              Object.keys(ModelFieldsTable),
              this.props.asset.model
            )}
            <p className="custom-message">
              {this.props.data_override
                ? "*Custom fields highlighted in blue"
                : null}
            </p>
          </table>
        </Callout>
        <Callout title={"Network Connections"} className={"propsview"}>
          {this.props.asset.model &&
          this.props.asset.model.network_ports &&
          this.props.asset.model.network_ports.length !== 0 ? (
            <div className="network-connections">
              <table className="bp3-html-table bp3-html-table-bordered bp3-html-table-striped">
                <tr>
                  <th>Network Port</th>
                  <th>Mac Address</th>
                  <th>Destination Asset</th>
                  <th>Destination Port</th>
                </tr>
                <tbody>
                  {this.props.asset.model.network_ports.map((port: string) => {
                    var connection = this.getNetworkConnectionForPort(port);
                    return (
                      <tr>
                        {" "}
                        <td style={getChangePlanRowStyle(this.props.asset)}>
                          {port}
                        </td>
                        <td style={getChangePlanRowStyle(this.props.asset)}>
                          {this.props.asset.mac_addresses
                            ? this.props.asset.mac_addresses[port]
                            : null}
                        </td>{" "}
                        {connection
                          ? [
                              <td
                                style={getChangePlanRowStyle(this.props.asset)}
                                className={
                                  this.props.asset.decommissioning_user
                                    ? undefined
                                    : "asset-link"
                                }
                              >
                                {connection.destination_hostname}
                              </td>,
                              <td
                                style={getChangePlanRowStyle(this.props.asset)}
                              >
                                {connection.destination_port}
                              </td>,
                            ]
                          : [<td></td>, <td></td>]}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Callout
              title="No network connections"
              icon={IconNames.INFO_SIGN}
            />
          )}
        </Callout>
        <Callout title={"Power Connections"} className={"propsview"}>
          {this.renderPower()}
        </Callout>
      </div>
    );
  }
}

export default withRouter(MobileAssetView);
