import {
  Button,
  ButtonGroup,
  Callout,
  Checkbox,
  Classes,
  Collapse,
  FormGroup,
  InputGroup,
  Intent,
  MenuItem
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { isNullOrUndefined } from "util";
import { ALL_DATACENTERS } from "../components/elementView/elementTabContainer";
import { PagingTypes } from "../components/elementView/elementUtils";
import { updateObject } from "../store/utility";
import { API_ROOT } from "../utils/api-config";
import {
  AssetObject,
  DatacenterObject,
  ElementObjectType,
  getHeaders,
  ModelObject,
  PowerPortAvailability,
  PowerSide,
  RackObject,
  ShallowAssetObject
} from "../utils/utils";
import Field from "./field";
import "./forms.scss";
import {
  DatacenterSelect,
  filterDatacenter,
  filterModel,
  filterRack,
  filterString,
  FormTypes,
  ModelSelect,
  RackSelect,
  renderDatacenterItem,
  renderModelItem,
  renderRackItem,
  renderStringItem,
  StringSelect
} from "./formUtils";

//TO DO : add validation of types!!!

export interface AssetFormProps {
  token: string;
  type: FormTypes;
  initialValues?: AssetObject;
  submitForm(Asset: ShallowAssetObject, headers: any): Promise<any> | void;
  datacenters?: Array<DatacenterObject>;
  currDatacenter?: DatacenterObject;
}
interface AssetFormState {
  values: AssetObject;
  currDatacenter?: DatacenterObject;
  racks: Array<RackObject>;
  models: Array<ModelObject>;
  errors: Array<string>;
  users: Array<string>;
  power_ports: PowerPortAvailability;
  power_ports_enabled: { [port: string]: boolean };
}
// var console: any = {};
// console.log = function() {};

export const required = (
  values: AssetObject,
  fieldName: keyof AssetObject
): string =>
  values[fieldName] === undefined ||
  values[fieldName] === null ||
  values[fieldName] === ""
    ? "This must be populated"
    : "";

class AssetForm extends React.Component<AssetFormProps, AssetFormState> {
  initialState: AssetObject = this.props.initialValues
    ? this.props.initialValues
    : ({} as AssetObject);
  private setPowerPortInputState = () => {
    const power_ports_enabled: { [port: string]: boolean } = {};
    if (this.state.values && this.state.values.power_connections) {
      Object.keys(this.state.values.power_connections).forEach(port => {
        power_ports_enabled[port] = true;
      });
    }
    return power_ports_enabled;
  };

  public state = {
    values: this.initialState,
    currDatacenter: this.props.currDatacenter,
    racks: [],
    models: [],
    errors: [],
    users: [],
    currModel: {} as ModelObject,
    //TODO, call endpoint, don't hard code
    power_ports: {
      left_suggest: "12",
      left_available: ["1", "2", "12"],
      right_suggest: "12",
      right_available: ["1", "2", "12", "13"]
    },
    power_ports_enabled: {} as { [port: string]: boolean }
  };
  headers = {
    headers: {
      Authorization: "Token " + this.props.token
    }
  };

  private getElementData(
    path: string,
    page: number,
    page_type: PagingTypes,
    body: any,
    token: string
  ): Promise<Array<ElementObjectType>> {
    console.log(API_ROOT + "api/" + path + "/get-many");

    const params =
      page_type === PagingTypes.ALL
        ? {}
        : {
            page_size: page_type,
            page
          };
    const config = {
      headers: {
        Authorization: "Token " + token
      },

      params: params
    };
    return axios
      .post(API_ROOT + "api/" + path + "/get-many", body, config)
      .then(res => {
        const items = res.data[path];

        return items;
      });
  }
  componentDidMount() {
    this.setPowerPortInputState();
    let values = this.state.values;
    if (values) {
      values = updateObject(values, {
        power_connections: {},
        mac_addresses: {}
      });
    }
    this.setState({
      values
    });
  }
  private mapAssetObject = (asset: AssetObject): ShallowAssetObject => {
    console.log(asset);

    const {
      hostname,
      id,
      rack_position,
      owner,
      mac_addresses,
      network_connections,
      power_connections,
      comment
    } = asset;
    const model = asset.model ? asset.model.id : undefined;
    const rack = asset.rack ? asset.rack.id : undefined;
    let valuesToSend: ShallowAssetObject = {
      model,
      rack,
      hostname,
      id,
      rack_position,
      owner,
      comment,
      mac_addresses,
      network_connections,
      power_connections
    };
    console.log(valuesToSend);

    return valuesToSend;
  };
  private handleSubmit = (e: any) => {
    this.setState({
      errors: []
    });
    e.preventDefault();
    if (this.state.values) {
      if (this.props.initialValues) {
        this.setState({
          values: updateObject(this.state.values, {
            id: this.props.initialValues.id
          })
        });
      }

      const resp = this.props.submitForm(
        this.mapAssetObject(this.state.values),
        this.headers
      );
      if (resp) {
        resp.catch(err => {
          console.log(err.response.data.failure_message);
          let errors: Array<string> = this.state.errors;
          errors.push(err.response.data.failure_message as string);
          this.setState({
            errors: errors
          });
        });
      }
    }
  };

  handleChange = (field: { [key: string]: any }) => {
    this.setState({
      values: updateObject(this.state.values, {
        ...field
      })
    });
  };
  getUsers = (token: string) => {
    const headers = getHeaders(token);
    axios
      .get(API_ROOT + "api/usernames", headers)
      .then(res => {
        this.setState({
          users: res.data.usernames
        });
      })
      .catch(err => {
        console.log(err);
      });
  };
  getRacks = (token: string) => {
    const headers = getHeaders(token);
    console.log(API_ROOT + "api/racks/summary");
    axios
      .get(API_ROOT + "api/racks/summary", headers)
      .then(res => {
        console.log(res.data.racks);
        this.setState({
          racks: res.data.racks as Array<RackObject>
        });
      })
      .catch(err => {
        console.log(err);
      });
  };
  getPowerButtonStatus = (side: PowerSide, port: number) => {
    console.log(this.state.values.power_connections);
    //if side has already been selected or this is a modify form
    if (
      this.state.values.power_connections &&
      this.state.values.power_connections[port]
    ) {
      const portString = (port as unknown) as string;
      console.log(
        "button is ",
        side === this.state.values.power_connections[portString].left_right
      );
      return (
        side === this.state.values.power_connections[portString].left_right
      );
      // } else if (port === 1) {
      //   return side === PowerSide.LEFT;
      // } else if (port === 2) {
      //   return side === PowerSide.RIGHT;
    } else {
      return false;
    }
  };

  shouldDisablePowerPort = (port: number) => {
    //if side has already been selected or this is a modify form
    if (
      this.state.values.power_connections &&
      this.state.values.power_connections[port]
    ) {
      return false;
    } else {
      return true;
    }
  };
  getPortsForSide = (port: number) => {
    //if side has already been selected or this is a modify form
    let side;
    if (
      this.state.values.power_connections &&
      this.state.values.power_connections[port]
    ) {
      const portString = (port as unknown) as string;
      side = this.state.values.power_connections[portString].left_right;
    }

    if (side === PowerSide.LEFT) {
      return this.state.power_ports.left_available;
    } else {
      return this.state.power_ports.right_available;
    }
  };
  setDefaultPortValues = (port: number, status: boolean) => {
    const power_connections = this.state.values.power_connections;
    if (status) {
      if (port === 1) {
        power_connections[port] = updateObject(power_connections, {
          left_right: PowerSide.LEFT,
          port_number: this.state.power_ports.left_suggest
        });
        this.setState({
          values: updateObject(this.state.values, {
            power_connections
          })
        });
      } else if (port === 2) {
        power_connections[port] = updateObject(power_connections, {
          left_right: PowerSide.RIGHT,
          port_number: this.state.power_ports.right_suggest
        });
        this.setState({
          values: updateObject(this.state.values, {
            power_connections
          })
        });
      }
    } else {
      power_connections[port] = updateObject(power_connections, {
        left_right: undefined,
        port_number: undefined
      });
      this.setState({
        values: updateObject(this.state.values, {
          power_connections
        })
      });
    }
  };

  changeCheckBoxState = (port: number, state: boolean) => {
    const power_ports_enabled = {
      ...this.state.power_ports_enabled
    };

    power_ports_enabled[port] = state;
    this.setState({
      power_ports_enabled
    });
  };
  getPowerPortFields = () => {
    console.log("powerpowerfields", this.state.values.model);
    if (this.state.values.model && this.state.values.model.num_power_ports) {
      console.log(
        "POWERPORTFIELDS",
        this.state.values.model.num_power_ports,
        parseInt(this.state.values.model.num_power_ports!, 10)
      );
    }

    if (
      this.state.values.model &&
      this.state.values.model.num_power_ports &&
      parseInt(this.state.values.model.num_power_ports, 10) > 0
    ) {
      const num_power_ports = parseInt(
        this.state.values.model.num_power_ports,
        10
      );
      const port_fields = [];
      for (let i = 1; i <= num_power_ports; i++) {
        console.log(this.state.power_ports_enabled[i]);
        port_fields.push(
          <div className="power-form-container">
            <div>
              {/* <ButtonGroup
                className="power-form-element"
                fill={false}
                style={{ marginTop: 5 }}
              > */}
              <i>Power Port{i}</i>

              {i === 1 || i === 2 ? (
                <div>
                  <Checkbox
                    className="checkbox"
                    checked={this.state.power_ports_enabled[i]}
                    label="Use Suggested Values "
                    onChange={(event: any) => {
                      console.log(
                        "setting staus to ",
                        !this.state.power_ports_enabled[i]
                      );
                      this.setDefaultPortValues(
                        i,
                        !this.state.power_ports_enabled[i]
                      );
                      this.changeCheckBoxState(
                        i,
                        !this.state.power_ports_enabled[i]
                      );
                    }}
                  />
                </div>
              ) : null}
              {/* </ButtonGroup>{" "} */}
            </div>
            {/* <Collapse
              className="power-form-element"
              isOpen={this.state.power_ports_enabled[i]} */}
            <div>
              <ButtonGroup
                className="power-form-element"
                fill={false}
                style={{ marginTop: 5 }}
              >
                <Button
                  active={this.getPowerButtonStatus(PowerSide.LEFT, i)}
                  text="Left"
                  onClick={(e: any) => {
                    console.log("Left Button");
                    const power_connections = this.state.values
                      .power_connections;
                    power_connections[i] = updateObject(power_connections[i], {
                      left_right: PowerSide.LEFT,
                      port_number: undefined
                    });
                    this.changeCheckBoxState(i, false);
                    this.setState({
                      values: updateObject(this.state.values, {
                        power_connections
                      })
                    });
                  }}
                />

                <Button
                  active={this.getPowerButtonStatus(PowerSide.RIGHT, i)}
                  text="Right"
                  onClick={(e: any) => {
                    console.log("Right Button ");
                    const power_connections = this.state.values
                      .power_connections;
                    power_connections[i] = updateObject(power_connections[i], {
                      left_right: PowerSide.RIGHT,
                      port_number: undefined
                    });
                    this.changeCheckBoxState(i, false);
                    this.setState({
                      values: updateObject(this.state.values, {
                        power_connections
                      })
                    });
                  }}
                />

                <StringSelect
                  className="power-form-element"
                  popoverProps={{
                    minimal: true,
                    popoverClassName: "dropdown",
                    usePortal: true
                  }}
                  disabled={this.shouldDisablePowerPort(i)}
                  items={this.getPortsForSide(i)}
                  onItemSelect={(port: string) => {
                    console.log(port);
                    this.changeCheckBoxState(i, false);
                    const power_connections = this.state.values
                      .power_connections;
                    power_connections[i] = updateObject(power_connections[i], {
                      port_number: port
                    });
                  }}
                  itemRenderer={renderStringItem}
                  itemPredicate={filterString}
                  noResults={<MenuItem disabled={true} text="No results." />}
                >
                  <Button
                    rightIcon="caret-down"
                    text={
                      this.state.values.power_connections[i] &&
                      this.state.values.power_connections[i].port_number
                        ? this.state.values.power_connections[i].port_number
                        : "PDU Port"
                    }
                  />
                </StringSelect>
              </ButtonGroup>
              {/* </Collapse> */}
            </div>
          </div>
        );
      }
      return port_fields;
    }
  };
  render() {
    console.log("CURR_STATE", this.state.values);
    if (this.state.models.length === 0) {
      this.getElementData(
        "models",
        1,
        PagingTypes.ALL,
        {},
        this.props.token
      ).then(res => {
        this.setState({
          models: res as Array<ModelObject>
        });
      });
    }
    if (this.state.racks.length === 0) {
      this.getRacks(this.props.token);
    }
    if (this.state.users.length === 0) {
      this.getUsers(this.props.token);
    }
    const { values } = this.state;
    return (
      <div className={Classes.DARK + " login-container"}>
        {this.state.errors.map((err: string) => {
          return <Callout intent={Intent.DANGER}>{err}</Callout>;
        })}
        <form onSubmit={this.handleSubmit} className="create-form ">
          <FormGroup label="Hostname (required)" inline={false}>
            <Field
              placeholder="hostname"
              onChange={this.handleChange}
              value={values.hostname}
              field="hostname"
            />
          </FormGroup>
          <FormGroup label="Datacenter (required)" inline={false}>
            <DatacenterSelect
              popoverProps={{
                minimal: true,
                popoverClassName: "dropdown",
                usePortal: true
              }}
              items={
                this.props.datacenters
                  ? this.props.datacenters
                  : [ALL_DATACENTERS]
              }
              onItemSelect={(datacenter: DatacenterObject) => {
                this.setState({
                  currDatacenter: datacenter
                });
              }}
              itemRenderer={renderDatacenterItem}
              itemPredicate={filterDatacenter}
              noResults={<MenuItem disabled={true} text="No results." />}
            >
              <Button
                rightIcon="caret-down"
                text={
                  this.props.currDatacenter && this.props.currDatacenter.name
                    ? this.props.currDatacenter.name
                    : "Select a datacenter"
                }
              />
            </DatacenterSelect>
          </FormGroup>
          <Collapse isOpen={!isNullOrUndefined(this.state.currDatacenter)}>
            <FormGroup label="Rack (required)" inline={false}>
              <RackSelect
                popoverProps={{
                  minimal: true,
                  popoverClassName: "dropdown",
                  usePortal: true
                }}
                items={this.state.racks}
                onItemSelect={(rack: RackObject) =>
                  this.setState({
                    values: updateObject(values, { rack: rack })
                  })
                }
                itemRenderer={renderRackItem}
                itemPredicate={filterRack}
                noResults={<MenuItem disabled={true} text="No results." />}
              >
                <Button
                  rightIcon="caret-down"
                  text={
                    this.state.values.rack
                      ? this.state.values.rack.row_letter +
                        " " +
                        this.state.values.rack.rack_num
                      : "Select a rack"
                  }
                />
              </RackSelect>
            </FormGroup>
          </Collapse>
          <FormGroup label="Rack position (required)" inline={false}>
            <Field
              field="rack_position"
              placeholder="rack_position"
              value={values.rack_position}
              onChange={this.handleChange}
            />
          </FormGroup>

          <FormGroup label="Model (required)" inline={false}>
            <ModelSelect
              className="select"
              popoverProps={{
                minimal: true,
                popoverClassName: "dropdown",
                usePortal: true
              }}
              items={this.state.models}
              onItemSelect={(model: ModelObject) =>
                this.setState({
                  values: updateObject(values, { model: model })
                })
              }
              itemRenderer={renderModelItem}
              itemPredicate={filterModel}
              noResults={<MenuItem disabled={true} text="No results." />}
            >
              <Button
                rightIcon="caret-down"
                text={
                  this.state.values.model
                    ? this.state.values.model.vendor +
                      " " +
                      this.state.values.model.model_number
                    : "Select a model"
                }
              />
            </ModelSelect>
          </FormGroup>
          <Collapse
            isOpen={
              values.model &&
              values.model.network_ports &&
              values.model.network_ports.length !== 0
            }
          >
            {!(
              values.model &&
              values.model.network_ports &&
              values.model.network_ports.length !== 0
            ) ? null : (
              <FormGroup label="Mac Addresses" inline={false}>
                <table className="port-table">
                  <tbody>
                    {values.model.network_ports.map((port, index) => {
                      return (
                        <tr>
                          <td>{port}</td>
                          <td>
                            <InputGroup
                              // value={port}
                              type="string"
                              className="network-name"
                              onChange={
                                (e: any) => {
                                  const mac_addresses = values.mac_addresses;
                                  mac_addresses[port] = e.currentTarget.value;

                                  this.setState({
                                    values: updateObject(this.state.values, {
                                      mac_addresses
                                    })
                                  });
                                }
                                // this.handleNetworkPortNameChange(
                                //   index,
                                //   e.currentTarget.value
                                // )
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </FormGroup>
            )}
          </Collapse>

          <Collapse
            isOpen={
              this.state.values.model &&
              !isNullOrUndefined(this.state.values.model.num_power_ports)
            }
          >
            {this.state.values.model &&
            this.state.values.model.num_power_ports &&
            parseInt(this.state.values.model.num_power_ports, 10) > 0 ? (
              <FormGroup label="Power Connections " inline={false}>
                {this.getPowerPortFields()}
              </FormGroup>
            ) : null}
          </Collapse>

          <FormGroup label="Owner" inline={false}>
            <StringSelect
              popoverProps={{
                minimal: true,
                popoverClassName: "dropdown",
                usePortal: true
              }}
              items={this.state.users}
              onItemSelect={(owner: string) =>
                this.setState({
                  values: updateObject(values, { owner: owner })
                })
              }
              // createNewItemRenderer={renderCreateItemOption}
              itemRenderer={renderStringItem}
              itemPredicate={filterString}
              noResults={<MenuItem disabled={true} text="No results." />}
            >
              <Button
                rightIcon="caret-down"
                text={
                  this.state.values.owner
                    ? this.state.values.owner
                    : "Select an owner"
                }
              />
            </StringSelect>
            {/* <Field
              field="owner"
              placeholder="owner"
              value={values.owner}
              onChange={this.handleChange}
            /> */}
          </FormGroup>
          <FormGroup label="Comment" inline={false}>
            <textarea
              className={Classes.INPUT}
              placeholder="comment"
              onChange={(e: any) =>
                this.handleChange({ comment: e.currentTarget.value })
              }
            ></textarea>
          </FormGroup>
          <Button className="login-button" type="submit">
            Submit
          </Button>
        </form>
      </div>
    );
  }
}

const mapStateToProps = (state: any) => {
  return {
    token: state.token
  };
};
export default connect(mapStateToProps)(AssetForm);

