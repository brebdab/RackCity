import { Card } from "@blueprintjs/core";
import * as React from "react";
import "@blueprintjs/core/lib/css/blueprint.css";

interface InstructionsLiteProps {
  uploadType: string;
}

var console: any = {};
console.log = function () {};
export class InstructionsLite extends React.PureComponent<
  InstructionsLiteProps
> {
  render() {
    return (
      <div className="instructions-div">
        <Card className="instructions-card">
          <h3>
            The following columns are required for {this.props.uploadType}:
          </h3>
          {this.props.uploadType === "models" ? (
            <ul className={"bp3-list"}>
              <li>
                <b>mount_type</b> – string; one of "asset", "chassis", or
                "blade"
              </li>
              <li>
                <b>vendor</b> – string
              </li>
              <li>
                <b>model_number</b> – string
              </li>
              <li>
                <b>height</b> – positive integer; refers to the height in U of
                the model; blank if model is a blade
              </li>
              <li>
                <b>display_color</b> – 6-digit hex triplet (RGB) preceded by a
                pound sign (#); case insensitive; e.g. #7FFFD4, #7fffd4
              </li>
              <li>
                <b>network_ports</b> – non-negative integer
              </li>
              <li>
                <b>power_ports</b> – non-negative integer
              </li>
              <li>
                <b>cpu</b> – string
              </li>
              <li>
                <b>memory</b> – non-negative integer
              </li>
              <li>
                <b>storage</b> – string
              </li>
              <li>
                <b>comment</b> – string; must be enclosed by double quotes if
                value contains line breaks
              </li>
              <li>
                <b>network_port_name 1</b> – string; if left blank and network
                port exists, value defaults to ”1”
              </li>
              <li>
                <b>network_port_name 2</b> – string; if left blank and network
                port exists, value defaults to ”2”
              </li>
              <li>
                <b>network_port_name 3</b> – string; if left blank and network
                port exists, value defaults to ”3”
              </li>
              <li>
                <b>network_port_name 4</b> – string; if left blank and network
                port exists, value defaults to ”4”
              </li>
            </ul>
          ) : null}
          {this.props.uploadType === "assets" ? (
            <ul className={"bp3-list"}>
              <li>
                <b>asset_number</b> – six-digit integer; must be unique unless
                modifying an existing asset; if left blank, a value will be
                generated automatically; matching an existing asset number
                indicates that this row should modify an existing asset in the
                system
              </li>
              <li>
                <b>hostname</b> – complies with RFC 1034 definition of ”label”
              </li>
              <li>
                <b>datacenter</b> – string; refers to the abbreviated form of an
                existing datacenter in the system (e.g. RTP1); blank if asset is
                stored offline; blank if asset is a blade
              </li>
              <li>
                <b>offline_site</b> – string; refers to the abbreviated form of
                an existing offline site in the system (e.g. OFF1); blank if
                asset is racked
              </li>
              <li>
                <b>rack</b> – string; the address of a rack is by a row letter
                (A-Z) and rack number (positive integer); there is no separator
                between the row letter and rack number; blank if asset is stored
                offline; blank if asset is a blade
              </li>
              <li>
                <b>rack_position</b> – positive integer; refers to the vertical
                location (on a rack, measured in U) of the bottom of the
                equipment; blank if asset is stored offline; blank if asset is a
                blade
              </li>
              <li>
                <b>chassis_number</b> – string; the asset number of a chassis
                that a blade is mounted in; blank if asset not a blade; blank if
                asset is stored offline outside a chassis
              </li>
              <li>
                <b>chassis_slot</b> – positive integer; 1-12; refers to the slot
                of a chassis that a blade is mounted in; blank if asset not a
                blade; blank if asset is stored offline outside of a chassis
              </li>
              <li>
                <b>vendor</b> – string; refers to the vendor of the model with
                which this asset is associated
              </li>
              <li>
                <b>model_number</b> – string; refers to the model number of the
                model with which this asset is associated
              </li>
              <li>
                <b>owner</b> – string; refers to the username of an existing
                user in the system who owns this equipment
              </li>
              <li>
                <b>comment</b> – string; must be enclosed by double quotes if
                value contains line breaks
              </li>
              <li>
                <b>power_port_connection_1</b> – reference to a PDU in the rack
                (L or R) and a port number (1 - 24); e.g. L5, R24; if left blank
                the power port will be disconnected
              </li>
              <li>
                <b>power_port_connection_2</b> – reference to a PDU in the rack
                and a port number (1 - 24); e.g.L5, R24; if left blank the power
                port will be disconnected
              </li>
              <li>
                <b>custom_display_color</b> – optionally override the asset’s
                model’s value; blank means default model’s value on both import
                and export; 6-digit hex triplet (RGB) preceded by a pound sign
                (#); case insensitive; e.g. #7FFFD4, #7fffd4
              </li>
              <li>
                <b>custom_cpu</b> – string; optionally override the asset’s
                model’s value; blank means default model’s value on both import
                and export
              </li>
              <li>
                <b>custom_memory</b> – non-negative integer; optionally override
                the asset’s model’s value; blank means default model’s value on
                both import and export
              </li>
              <li>
                <b>custom_storage</b> – string; optionally override the asset’s
                model’s value; blank means default model’s value on both import
                and export
              </li>
            </ul>
          ) : null}
          {this.props.uploadType === "network connections" ? (
            <ul className={"bp3-list"}>
              <li>
                <b>src hostname</b> – string; matches the hostname of an
                existing asset in the system
              </li>
              <li>
                <b>src port</b> – string; matches a network port name defined by
                the source asset’s model
              </li>
              <li>
                <b>src mac</b> – six-byte MAC address; format must comply with
                Requirement 2.2.1.5; sets this value for the associated src port
              </li>
              <li>
                <b>dest hostname</b> – string; matches the hostname of an
                existing asset in the system; leaving blank will disconnect src
                port if it’s currently connected
              </li>
              <li>
                <b>dest port</b> – string; matches a network port name defined
                by the destination asset’s model; must be given a value if a
                value is given for dest hostname; must be left blank if dest
                hostname is left blank
              </li>
            </ul>
          ) : null}
          <h3>
            You can find the full technical specification here:&nbsp;
            <a href="https://d1b10bmlvqabco.cloudfront.net/attach/k4u27qnccr45oo/is4xdnkb8px4ee/k90vqcj1j0tn/ECE458__Bulk_Format_Proposal6.pdf">
              HypoSoft Bulk Import Specifications
            </a>
          </h3>
        </Card>
      </div>
    );
  }
}

export default InstructionsLite;
