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
} from "../../utils/utils";

interface MobileAssetViewProps {
  asset: AssetObject;
  data_override: any;
}

export class MobileAssetView extends React.PureComponent<
  MobileAssetViewProps & RouteComponentProps
> {
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

      if (isAssetObject(this.props.asset)) {
        return AssetFieldsTable[item] ? (
          <tr>
            <td key={item}>
              <p className="label">{AssetFieldsTable[item]}:</p>
            </td>

            <td style={getChangePlanRowStyle(data)}>{dat}</td>
          </tr>
        ) : null;
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

  render() {
    console.log(this.props.asset);
    return (
      <div className={Classes.DARK}>
        <Callout title={"Asset Properties"}>
          <table>
            {this.renderData(
                  AssetFieldsTable,
                  this.props.asset
                )}
          </table>
        </Callout>
        <Callout title={"Model Properties"}>
          <p>Models</p>
        </Callout>
        <Callout title={"Network Connections"}>
          <p>Network Connections</p>
        </Callout>
        <Callout title={"Power Connections"}>
          <p>Power Connections</p>
        </Callout>
      </div>
    );
  }
}

export default withRouter(MobileAssetView);
