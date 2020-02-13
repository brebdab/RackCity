import { Card, Elevation } from "@blueprintjs/core";
import * as React from "react";
import "@blueprintjs/core/lib/css/blueprint.css";

interface insnProps { };

export class Instructions extends React.PureComponent<insnProps> {
  render() {
    return (
      <div className={"bp3-heading"}>
        <Card elevation={Elevation.ONE}>
          <div>
            <h2>Upload instructions:</h2>
          </div>
          <h3>General format:</h3>
            <ol className={"bp3-list"}>
              <li>All files should be CSV format in compliance with RFC 4180. Important specifications are outlined as follows:
                <ul className={"bp3-list"}>
                  <li>Each record is located on a separate line, delimited by a line break (Note: the last file may or may not have an ending line break)</li>
                  <li>Each record should contain the same number of comma-separated fields</li>
                  <li>Spaces are considered part of a field and should not be ignored</li>
                  <li>Each field may or may not be enclosed in double quotes</li>
                  <li>Fields containing a line break, double quote, or commas MUST be quoted</li>
                  <li>If double quote are used to enclose fields, then a double quote appearing inside a field must be escaped by preceding it with another double quote</li>
                </ul>
              </li>
              <li>Deviations from this standard are as follows:
                <ul className={"bp3-list"}>
                  <li>A header row is required. See below for column headers for various equipment files</li>
                  <li> On import both *nix (LF) and Windows-style (CRLF) line endings are accepted
                    <ul>
                      <li>On export, Windows-style endings (CRLF) will be emitted in conformance to the standard</li>
                      <li>Thes same rules apply to line breaks within multi-line string values (i.e. comments)</li>
                    </ul>
                  </li>
                  <li>UTF-8 charset is used for both import and export
                    <ul>
                      <li>Double quotes should use code U+0022 QUOTATION MARK</li>
                      <li>Commas should use code U+002C COMMA</li>
                    </ul>
                  </li>
                </ul>
              </li>
            </ol>
          <h3>Model/Instance-specific fields:</h3>
            <Card elevation={Elevation.THREE}>
              <h4>Model upload:</h4>
              <ol className={"bp3-list"}>
                <li>Fields:
                  <ul className={"bp3-list"}>
                    <li>vendor: required always; string</li>
                    <li>model_number: required always; string</li>
                    <li>height: required for new modes, otherwise optional; positive integer; height in U</li>
                    <li>display_color: optional; 6-digit, 3-byte hex triplet (RGB) preceded by pound sign (#); case insensitive; e.g. #7FFFD4</li>
                    <li>ethernet_ports: optional; non-negative integer</li>
                    <li>power_ports: optional, non-negative integer</li>
                    <li>cpu: optional; string</li>
                    <li>memory: optional; string</li>
                    <li>comment: optional; string; must be enclosed by double quotes if the value contains line breaks</li>
                  </ul>
                </li>
              </ol>
            </Card>
            <Card elevation={Elevation.THREE}>
              <h4>Instance upload:</h4>
              <ol className={"bp3-list"}>
                <li>Fields:
                  <ul className={"bp3-list"}>
                    <li>hostname: required always; RFC-1034-compliant string</li>
                    <li>rack: required for new instances, otherwise optional; string; address is by row letter (A-Z) then rack number (positive integer); There is no separator between row letter and rack number</li>
                    <li>rack_position: required for new instances, otherwise optional; positive integer; refers to vertical location in U of bottom of equipment</li>
                    <li>vendor: required for new instances, otherwise optional; string; refers to vendor of the model with which this instance is associated</li>
                    <li>model_number: required for new instances, otherwise optional; string; refers to model number of the model with which this instance is associated. Together with vendor uniquely identifies a model</li>
                    <li>owner: optional; string; refers to the username of an existing user in the system who owns this equipment</li>
                    <li>comment: optiona; string; must be enclosed by double quotes if the value contains line breaks</li>
                  </ul>
                </li>
              </ol>
            </Card>
          <h4>Notes:</h4>
          <ol className={"bp3-list"}>
            <li>It is not possible to use the bulk import feature to modify a field marked "required always." Any attempt to do so will result in a new model/instance being created</li>
            <li>Any field not included in an import will be considered "matching" (i.e. if the record exists, the empty field will not be overwritten)</li>
          </ol>
        </Card>
      </div>
    )
  }
}

export default Instructions
