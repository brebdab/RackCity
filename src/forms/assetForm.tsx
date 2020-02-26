import {
  Alert,
  Button,
  ButtonGroup,
  Callout,
  Checkbox,
  Classes,
  Collapse,
  FormGroup,
  Icon,
  InputGroup,
  Intent,
  MenuItem,
  Spinner,
  Tooltip,
  Card
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import { IconNames } from "@blueprintjs/icons";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { isNullOrUndefined } from "util";
import { ALL_DATACENTERS } from "../components/elementView/elementTabContainer";
import {
  FilterTypes,
  IFilter,
  PagingTypes,
  TextFilterTypes
} from "../components/elementView/elementUtils";
import { updateObject } from "../store/utility";
import { API_ROOT } from "../utils/api-config";
import {
  AssetFormLabels,
  AssetObject,
  DatacenterObject,
  ElementObjectType,
  ElementType,
  getHeaders,
  isAssetObject,
  isDatacenterObject,
  isRackObject,
  ModelObject,
  NetworkConnection,
  PowerConnection,
  PowerPortAvailability,
  PowerSide,
  RackObject,
  ShallowAssetObject
} from "../utils/utils";
import Field from "./field";
import "./forms.scss";
import {
  AssetSelect,
  DatacenterSelect,
  filterAsset,
  filterDatacenter,
  filterModel,
  filterRack,
  filterString,
  FormTypes,
  isMacAddressValid,
  macAddressInfo,
  ModelSelect,
  RackSelect,
  renderAssetItem,
  renderDatacenterItem,
  renderModelItem,
  renderRackItem,
  renderStringItem,
  StringSelect
} from "./formUtils";
import $ from "jquery";
//TO DO : add validation of types!!!

export interface AssetFormProps {
  token: string;
  type: FormTypes;
  initialValues?: AssetObject;
  isOpen: boolean;
  submitForm(Asset: ShallowAssetObject, headers: any): Promise<any> | void;
  pageScroll?(): void;
  datacenters: Array<DatacenterObject>;
  currDatacenter: DatacenterObject;
}
interface AssetFormState {
  values: AssetObject;
  currDatacenter?: DatacenterObject;
  racks: Array<RackObject>;
  models: Array<ModelObject>;
  errors: Array<string>;
  users: Array<string>;
  power_ports: PowerPortAvailability;
  power_ports_default: { [port: string]: boolean };
  assets: Array<AssetObject>;
  left_ports: Array<string>;
  right_ports: Array<string>;
  isAlertOpen: boolean;
  warningMessage: string;
  selectedValue: any;
  loading: boolean;
}
var console: any = {};
console.log = function() {};

class AssetForm extends React.Component<AssetFormProps, AssetFormState> {
  initialState: AssetObject = this.props.initialValues
    ? JSON.parse(JSON.stringify(this.props.initialValues))
    : ({} as AssetObject);
  private setPowerPortInputState = () => {
    const power_ports_default: { [port: string]: boolean } = {};
    if (this.state.values && this.state.values.power_connections) {
      Object.keys(this.state.values.power_connections).forEach(port => {
        power_ports_default[port] = true;
      });
    }
    return power_ports_default;
  };
  initialGetRacks = false;
  gettingAssetsInProgress = false;
  gettingRacksInProgress = false;
  gettingPowerPortsInProgress = false;

  public state = {
    values: this.initialState,
    currDatacenter: this.initialState.rack
      ? this.initialState.rack.datacenter
      : this.props.currDatacenter === ALL_DATACENTERS
      ? undefined
      : this.props.currDatacenter,
    racks: [],
    models: [],
    errors: [],
    users: [],
    assets: [],
    left_ports: [],
    right_ports: [],
    //TODO, call endpoint, don't hard code
    power_ports: {} as PowerPortAvailability,
    // power_ports: {
    //   left_suggest: "12",
    //   left_available: ["1", "2", "12"],
    //   right_suggest: "12",
    //   right_available: ["1", "2", "12", "13"]
    // },
    power_ports_default: {} as { [port: string]: boolean },
    isAlertOpen: false,
    warningMessage: "",
    selectedValue: undefined,
    loading: false
  };

  getPowerPortAvailability(rack: RackObject) {
    this.gettingPowerPortsInProgress = true;
    const params = { id: rack.id };
    const config = {
      headers: {
        Authorization: "Token " + this.props.token
      },

      params: params
    };
    axios.get(API_ROOT + "api/power/availability", config).then(res => {
      this.gettingPowerPortsInProgress = false;
      this.setState({ power_ports: res.data });
    });
  }

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
  getAssetNumber() {
    axios
      .get(API_ROOT + "api/assets/asset-number", getHeaders(this.props.token))
      .then((res: any) => {
        this.setState({
          values: updateObject(this.state.values, {
            asset_number: res.data.asset_number
          })
        });
      });
  }
  componentDidMount() {
    this.setPowerPortInputState();
    if (!this.state.values.asset_number && !this.props.initialValues) {
      this.getAssetNumber();
    }
    if (this.state.values.rack) {
      this.getPowerPortAvailability(this.state.values.rack);
    }

    let values = this.state.values;
    if (!this.props.initialValues) {
      values = updateObject(values, {
        power_connections: {},
        mac_addresses: {}
      });
    }
    this.setState({
      values
    });
    this.getValidAssets(this.state.currDatacenter!);
    this.getRacks(this.state.currDatacenter!);
  }
  private mapAssetObject = (asset: AssetObject): ShallowAssetObject => {
    const {
      asset_number,
      hostname,
      id,
      rack_position,
      owner,
      mac_addresses,
      network_connections,
      power_connections,
      comment
    } = asset;
    const model = asset.model ? asset.model.id : null;
    const rack = asset.rack ? asset.rack.id : null;
    let valuesToSend: ShallowAssetObject = {
      asset_number,
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

    return valuesToSend;
  };

  private handleSubmit = (e: any) => {
    e.preventDefault();
    if (this.state.values) {
      this.setState({
        errors: [],
        loading: true
      });

      this.validateMacAddresses();
      let newValues = this.state.values;

      if (this.state.values.hostname === "") {
        delete newValues.hostname;
      }
      if (this.state.values.asset_number === "") {
        delete newValues.asset_number;
      }
      if (this.props.initialValues) {
        newValues.id = this.props.initialValues.id;
      }
      this.setState({
        values: newValues
      });

      console.log("submitting form");
      const resp = this.props.submitForm(
        this.mapAssetObject(newValues),
        getHeaders(this.props.token)
      );
      if (resp) {
        resp.then(res =>
          this.setState({
            loading: false
          })
        );
        resp.catch(err => {
          $(".bp3-overlay-scroll-container").scrollTop(0);
          let errors: Array<string> = this.state.errors;
          errors.push(err.response.data.failure_message as string);
          this.setState({
            errors: errors,
            loading: false
          });
        });
      }
    }
  };

  validateMacAddresses = () => {
    Object.entries(this.state.values.mac_addresses).forEach(
      ([port, mac_address]) => {
        if (mac_address === "") {
          delete this.state.values.mac_addresses[port];
        } else if (!isMacAddressValid(mac_address)) {
          const errors: Array<string> = this.state.errors;
          errors.push(
            "Mac Address " +
              '"' +
              mac_address +
              '"' +
              " for " +
              '"' +
              port +
              '"' +
              " is invalid."
          );
          this.setState({
            errors
          });
        }
      }
    );
  };
  handleChange = (field: { [key: string]: any }) => {
    this.setState({
      values: updateObject(this.state.values, {
        ...field
      })
    });
  };
  getUsers = () => {
    const headers = getHeaders(this.props.token);
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
  getRacks = (datacenter: DatacenterObject) => {
    console.log("GETTING RACKS for ", datacenter);
    if (datacenter) {
      this.gettingRacksInProgress = true;
      const config = {
        headers: {
          Authorization: "Token " + this.props.token
        },
        params: {
          datacenter: datacenter ? datacenter.id : undefined
        }
      };
      console.log(API_ROOT + "api/racks/summary");
      axios
        .get(API_ROOT + "api/racks/summary", config)
        .then(res => {
          console.log(res.data.racks);
          this.initialGetRacks = true;
          this.gettingRacksInProgress = false;
          this.setState({
            racks: res.data.racks as Array<RackObject>
          });
        })
        .catch(err => {
          console.log(err);
        });
    }
  };
  getModels = () => {
    this.getElementData(
      ElementType.MODEL,
      1,
      PagingTypes.ALL,
      {},
      this.props.token
    ).then(res => {
      this.setState({
        models: res as Array<ModelObject>
      });
    });
  };
  getValidAssets = (currDatacenter: DatacenterObject) => {
    this.gettingAssetsInProgress = true;
    console.log("getting assets from this datacenter", currDatacenter);
    let body = {};
    const filters: Array<IFilter> = [];
    let datacenterName;
    if (currDatacenter) {
      if (currDatacenter.name !== ALL_DATACENTERS.name) {
        datacenterName = currDatacenter.name;
        filters.push({
          id: "",
          field: "rack__datacenter__name",
          filter_type: FilterTypes.TEXT,
          filter: { value: datacenterName, match_type: TextFilterTypes.EXACT }
        });
        body = updateObject(body, { filters });
      }
    }

    this.getElementData(
      ElementType.ASSET,
      1,
      PagingTypes.ALL,
      body,
      this.props.token
    ).then(res => {
      console.log(res);
      let assetsWithHostname: Array<AssetObject> = res as Array<AssetObject>;
      assetsWithHostname = assetsWithHostname.filter(asset => {
        if (
          asset.hostname === "" ||
          asset.hostname === this.state.values.hostname
        ) {
          return false;
        }
        return true;
      });
      console.log("got assets", assetsWithHostname);

      this.setState({
        assets: assetsWithHostname as Array<AssetObject>
      });
      this.gettingAssetsInProgress = false;
    });
  };
  getPowerButtonStatus = (side: PowerSide, port: number) => {
    if (
      this.state.values.power_connections &&
      this.state.values.power_connections[port]
    ) {
      const portString = (port as unknown) as string;
      return (
        side === this.state.values.power_connections[portString].left_right
      );
    } else {
      return false;
    }
  };

  shouldDisablePowerPort = (port: number) => {
    if (!this.state.values.rack) {
      return true;
    }
    return !(
      this.state.values.power_connections &&
      this.state.values.power_connections[port]
    );
  };
  getPortsForSide = (port: number) => {
    let side;
    // console.log(this.state.values.power_connections, this.state.power_ports);
    if (
      this.state.values.power_connections &&
      this.state.values.power_connections[port] &&
      Object.keys(this.state.power_ports).length > 0
    ) {
      const portString = (port as unknown) as string;
      side = this.state.values.power_connections[portString].left_right;

      if (side === PowerSide.LEFT) {
        return this.state.power_ports.left_available.map(String);
      } else {
        return this.state.power_ports.right_available.map(String);
      }
    }
    return [];
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
    const power_ports_default = {
      ...this.state.power_ports_default
    };

    power_ports_default[port] = state;
    this.setState({
      power_ports_default: power_ports_default
    });
  };
  getClearedPowerSelections() {
    if (
      this.state.values.model &&
      this.state.values.model.num_power_ports &&
      parseInt(this.state.values.model.num_power_ports, 10) > 0 &&
      this.state.values.power_connections
    ) {
      const num_power_ports = parseInt(
        this.state.values.model.num_power_ports,
        10
      );
      const power_connections = this.state.values.power_connections;
      for (let i = 1; i <= num_power_ports; i++) {
        power_connections[i] = {} as PowerConnection;
      }
      return power_connections;
    }
    return {};
  }

  clearPowerSelection = (port: number) => {
    const power_connections = this.state.values.power_connections;
    if (power_connections && power_connections[port]) {
      this.changeCheckBoxState(port, false);

      power_connections[port] = {} as PowerConnection;

      this.setState({
        values: updateObject(this.state.values, {
          power_connections
        })
      });
    }
  };
  getPowerPortFields = () => {
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
        port_fields.push(
          <div className="power-form-container">
            <div>
              <i className="section-title">Power Port: {i}</i>

              {i === 1 || i === 2 ? (
                <div>
                  <Checkbox
                    className="checkbox"
                    disabled={isNullOrUndefined(this.state.values.rack)}
                    checked={this.state.power_ports_default[i]}
                    label="Use Suggested Values "
                    onChange={(event: any) => {
                      this.setDefaultPortValues(
                        i,
                        !this.state.power_ports_default[i]
                      );
                      this.changeCheckBoxState(
                        i,
                        !this.state.power_ports_default[i]
                      );
                    }}
                  />
                </div>
              ) : null}
            </div>

            <div>
              <ButtonGroup
                className="power-form-element"
                fill={false}
                style={{ marginTop: 5 }}
              >
                <Button
                  active={this.getPowerButtonStatus(PowerSide.LEFT, i)}
                  text="Left"
                  disabled={isNullOrUndefined(this.state.values.rack)}
                  onClick={(e: any) => {
                    const power_connections = this.state.values
                      .power_connections;
                    if (power_connections) {
                      power_connections[i] = updateObject(
                        power_connections[i],
                        {
                          left_right: PowerSide.LEFT,
                          port_number: null
                        }
                      );
                      this.changeCheckBoxState(i, false);
                      this.setState({
                        values: updateObject(this.state.values, {
                          power_connections
                        })
                      });
                    }
                  }}
                />

                <Button
                  active={this.getPowerButtonStatus(PowerSide.RIGHT, i)}
                  text="Right"
                  disabled={isNullOrUndefined(this.state.values.rack)}
                  onClick={(e: any) => {
                    const power_connections = this.state.values
                      .power_connections;
                    power_connections[i] = updateObject(power_connections[i], {
                      left_right: PowerSide.RIGHT,
                      port_number: null
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
                    this.changeCheckBoxState(i, false);
                    const power_connections = this.state.values
                      .power_connections;
                    power_connections[i] = updateObject(power_connections[i], {
                      port_number: port
                    });
                    this.setState({
                      values: updateObject(this.state.values, {
                        power_connections
                      })
                    });
                  }}
                  itemRenderer={renderStringItem}
                  itemPredicate={filterString}
                  noResults={<MenuItem disabled={true} text="No results." />}
                >
                  <Button
                    disabled={this.shouldDisablePowerPort(i)}
                    rightIcon="caret-down"
                    text={
                      this.state.values.power_connections &&
                      this.state.values.power_connections[i] &&
                      this.state.values.power_connections[i].port_number
                        ? this.state.values.power_connections[i].port_number
                        : "PDU Port"
                    }
                  />
                </StringSelect>
                <Button
                  icon={IconNames.DELETE}
                  minimal
                  onClick={() => {
                    this.clearPowerSelection(i);
                  }}
                />
              </ButtonGroup>
            </div>
          </div>
        );
      }
      return port_fields;
    }
  };

  getValidDatacenters() {
    return this.props.datacenters.filter(
      datacenter => datacenter !== ALL_DATACENTERS
    );
  }

  handleDatacenterSelect(datacenter: DatacenterObject) {
    const clearedNetworkConnections = this.getClearedNetworkConnections();
    const clearedPowerConnections = this.getClearedPowerSelections();
    const newValues = updateObject(this.state.values, {
      rack: undefined,
      power_connections: clearedPowerConnections,
      network_connections: clearedNetworkConnections
    });
    console.log("SELECTER DATACENTER", datacenter, newValues);
    this.setState({
      currDatacenter: datacenter,
      values: newValues
    });

    this.getValidAssets(datacenter);
    this.getRacks(datacenter);
  }

  handleRackSelect(rack: RackObject) {
    console.log("SELECTED RACK:", rack);

    const clearedPowerConnections = this.getClearedPowerSelections();
    this.setState({
      values: updateObject(this.state.values, {
        rack: rack,
        power_connections: clearedPowerConnections
      })
    });

    this.getPowerPortAvailability(rack);
  }
  handleNetworkConnectionAssetSelection(
    source_port: string,
    destination_hostname: string | undefined
  ) {
    console.log(
      "network connection asset selected",
      source_port,
      destination_hostname
    );
    const newNetworkConnection: NetworkConnection = {
      source_port,
      destination_hostname,
      destination_port: null
    };
    let modification = false;
    let networkConnections: Array<NetworkConnection> = [];
    if (this.state.values.network_connections) {
      networkConnections = this.state.values.network_connections.slice();

      networkConnections = networkConnections.map(
        (connection: NetworkConnection) => {
          if (connection.source_port === source_port) {
            console.log("updating network connection");
            modification = true;
            return updateObject(connection, {
              destination_hostname: destination_hostname,
              destination_port: null
            });
          } else {
            return connection;
          }
        }
      );
    } else {
      networkConnections = [] as Array<NetworkConnection>;
    }
    console.log("UPDADTING NEWORK CONNECTIONS", networkConnections);
    if (!modification) {
      //add a new network connection
      networkConnections.push(newNetworkConnection);
    }
    console.log("new network connections", networkConnections);
    this.setState({
      values: updateObject(this.state.values, {
        network_connections: networkConnections
      })
    });
  }

  getClearedNetworkConnections() {
    if (this.state.values.network_connections) {
      return this.state.values.network_connections.map(
        (connection: NetworkConnection) => {
          return updateObject(connection, {
            destination_hostname: null,
            destination_port: null
          });
        }
      );
    }
    return [];
  }
  clearNetworkConnectionSelection(source_port: string) {
    let networkConnections: Array<NetworkConnection> = [];
    if (this.state.values.network_connections) {
      networkConnections = this.state.values.network_connections.slice();

      networkConnections = networkConnections.map(
        (connection: NetworkConnection) => {
          if (connection.source_port === source_port) {
            return updateObject(connection, {
              destination_hostname: null,
              destination_port: null
            });
          } else {
            return connection;
          }
        }
      );
    } else {
      networkConnections = [] as Array<NetworkConnection>;
    }

    this.setState({
      values: updateObject(this.state.values, {
        network_connections: networkConnections
      })
    });
  }
  handleNetworkConnectionPortSelection(
    source_port: string,
    destination_port: string | undefined
  ) {
    let networkConnections: Array<NetworkConnection> = [];
    if (this.state.values.network_connections) {
      networkConnections = this.state.values.network_connections.slice();

      networkConnections = networkConnections.map(
        (connection: NetworkConnection) => {
          if (connection.source_port === source_port) {
            return updateObject(connection, { destination_port });
          } else {
            return connection;
          }
        }
      );
    } else {
      networkConnections = [] as Array<NetworkConnection>;
    }

    this.setState({
      values: updateObject(this.state.values, {
        network_connections: networkConnections
      })
    });
  }
  getSelectedPort = (source_port: string) => {
    if (this.state.values.network_connections) {
      const connection = this.state.values.network_connections.find(
        (connection: NetworkConnection) =>
          connection.source_port === source_port
      );
      if (connection) {
        return connection.destination_port;
      }
    }
  };
  getSelectedNetworkConnectionAsset(source_port: string) {
    if (this.state.values.network_connections) {
      const connection = this.state.values.network_connections.find(
        (connection: NetworkConnection) =>
          connection.source_port === source_port
      );
      if (connection) {
        return connection.destination_hostname;
      }
    }
  }

  getAssetObjectFromHostname(hostname: string): AssetObject | void {
    return this.state.assets.find(
      (asset: AssetObject) => asset.hostname === hostname
    );
  }

  getPortsFromHostname(hostname: string) {
    const asset = this.getAssetObjectFromHostname(hostname);
    console.log("getting ports for " + hostname);
    if (isAssetObject(asset)) {
      return asset.model.network_ports ? asset.model.network_ports : [];
    } else {
      return [];
    }
  }
  getChangeWarningAlert() {
    return (
      <Alert
        className={Classes.DARK}
        cancelButtonText="Cancel"
        confirmButtonText="Change"
        intent={Intent.WARNING}
        icon={IconNames.WARNING_SIGN}
        isOpen={this.state.isAlertOpen}
        onCancel={this.handleChangeDecline}
        onConfirm={this.handleChangeAccept}
      >
        <p>{this.state.warningMessage}</p>
      </Alert>
    );
  }

  handleChangeDecline = () => {
    this.setState({
      isAlertOpen: false
    });
  };

  showChangeWarningAlert(warningMessage: string, selectedValue: any) {
    this.setState({
      warningMessage,
      selectedValue,
      isAlertOpen: true
    });
  }

  handleChangeAccept = () => {
    if (
      this.state.selectedValue &&
      isDatacenterObject(this.state.selectedValue)
    ) {
      this.handleDatacenterSelect(this.state.selectedValue!);
    }
    if (this.state.selectedValue && isRackObject(this.state.selectedValue)) {
      this.handleRackSelect(this.state.selectedValue!);
    }
    this.setState({
      isAlertOpen: false
    });
  };

  render() {
    if (this.state.models.length === 0) {
      this.getModels();
    }
    if (this.state.users.length === 0) {
      this.getUsers();
    }

    if (
      this.state.currDatacenter &&
      this.state.currDatacenter !== ALL_DATACENTERS &&
      !this.initialGetRacks
    ) {
      this.getRacks(this.state.currDatacenter);
    }

    console.log(this.state.values);
    const { values } = this.state;
    return (
      <div className={Classes.DARK + " login-container"}>
        {this.getChangeWarningAlert()}
        {this.state.errors.map((err: string) => {
          return <Callout intent={Intent.DANGER}>{err}</Callout>;
        })}
        <form onSubmit={this.handleSubmit} className="create-form ">
          <Card>
            <FormGroup
              label={
                <div className="text-with-tooltip">
                  {" "}
                  {AssetFormLabels.asset_number}{" "}
                  <Tooltip
                    className="tooltip-icon"
                    content={
                      "If no asset number provided, will be autogenerated on creation"
                    }
                  >
                    <Icon icon={IconNames.INFO_SIGN} />
                  </Tooltip>{" "}
                </div>
              }
              inline={false}
            >
              <Field
                placeholder="asset_number"
                onChange={this.handleChange}
                value={values.asset_number}
                field="asset_number"
              />
            </FormGroup>
            <FormGroup label={AssetFormLabels.hostname} inline={false}>
              <Field
                placeholder="hostname"
                onChange={this.handleChange}
                value={values.hostname}
                field="hostname"
              />
            </FormGroup>
          </Card>
          <Card>
            <FormGroup label={AssetFormLabels.datacenter} inline={false}>
              <DatacenterSelect
                popoverProps={{
                  minimal: true,
                  popoverClassName: "dropdown",
                  usePortal: true
                }}
                items={this.getValidDatacenters()}
                onItemSelect={(datacenter: DatacenterObject) => {
                  this.state.currDatacenter
                    ? this.showChangeWarningAlert(
                        "Are you sure you want to change datacenter? This will clear all datacenter related properties",
                        datacenter
                      )
                    : this.handleDatacenterSelect(datacenter);
                }}
                itemRenderer={renderDatacenterItem}
                itemPredicate={filterDatacenter}
                noResults={<MenuItem disabled={true} text="No results." />}
              >
                <Button
                  rightIcon="caret-down"
                  text={
                    this.state.currDatacenter && this.state.currDatacenter.name
                      ? this.state.currDatacenter.name
                      : "Select a Datacenter"
                  }
                />
              </DatacenterSelect>
            </FormGroup>
          </Card>
          <Collapse
            isOpen={!isNullOrUndefined(this.state.currDatacenter)}
            keepChildrenMounted={true}
          >
            <Card>
              <FormGroup label={AssetFormLabels.rack} inline={false}>
                <RackSelect
                  popoverProps={{
                    minimal: true,
                    popoverClassName: "dropdown",
                    usePortal: true
                  }}
                  items={this.state.racks}
                  onItemSelect={(rack: RackObject) => {
                    this.state.values.rack
                      ? this.showChangeWarningAlert(
                          "Are you sure you want to change rack? This will clear all rack related fields",
                          rack
                        )
                      : this.handleRackSelect(rack);
                  }}
                  itemRenderer={renderRackItem}
                  itemPredicate={filterRack}
                  noResults={
                    this.gettingRacksInProgress ? (
                      <div>
                        <Spinner intent="primary" size={Spinner.SIZE_SMALL} />
                        <MenuItem disabled={true} text="Getting all racks" />
                      </div>
                    ) : (
                      <MenuItem disabled={true} text="No available racks" />
                    )
                  }
                >
                  <Button
                    rightIcon="caret-down"
                    text={
                      this.state.values.rack
                        ? this.state.values.rack.row_letter +
                          +this.state.values.rack.rack_num
                        : "Select a rack"
                    }
                  />
                </RackSelect>
              </FormGroup>
              <FormGroup label={AssetFormLabels.rack_position} inline={false}>
                <Field
                  field="rack_position"
                  placeholder="rack_position"
                  value={values.rack_position}
                  onChange={this.handleChange}
                />
              </FormGroup>
            </Card>
            <Card>
              <FormGroup label={AssetFormLabels.model} inline={false}>
                <ModelSelect
                  className="select"
                  popoverProps={{
                    minimal: true,
                    popoverClassName: "dropdown",
                    usePortal: true
                  }}
                  disabled={!isNullOrUndefined(this.initialState.model)}
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
                    disabled={!isNullOrUndefined(this.initialState.model)}
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
            </Card>
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
                <Card>
                  <FormGroup
                    label={AssetFormLabels.network_ports}
                    inline={false}
                  >
                    {values.model.network_ports.map((port, index) => {
                      return (
                        <div className="power-form-container">
                          <i className="section-title">
                            {"Network Port: " + port}
                          </i>
                          <div>
                            <div className="text-with-tooltip">
                              {"Mac Address "}
                              <Tooltip
                                className="tooltip-icon"
                                content={macAddressInfo}
                              >
                                <Icon icon={IconNames.INFO_SIGN} />
                              </Tooltip>
                            </div>
                            <InputGroup
                              value={values.mac_addresses[port]}
                              type="string"
                              className="network-name"
                              onChange={(e: any) => {
                                const mac_addresses = values.mac_addresses;
                                mac_addresses[port] = e.currentTarget.value;

                                this.setState({
                                  values: updateObject(this.state.values, {
                                    mac_addresses
                                  })
                                });
                              }}
                            />
                          </div>
                          <FormGroup
                            label="Add Network Connection"
                            inline={false}
                          >
                            <AssetSelect
                              className="select"
                              popoverProps={{
                                minimal: true,
                                popoverClassName: "dropdown",
                                usePortal: true
                              }}
                              items={this.state.assets}
                              onItemSelect={(asset: AssetObject) => {
                                this.handleNetworkConnectionAssetSelection(
                                  port,
                                  asset.hostname
                                );
                              }}
                              itemRenderer={renderAssetItem}
                              itemPredicate={filterAsset}
                              noResults={
                                this.gettingAssetsInProgress ? (
                                  <div>
                                    <Spinner
                                      intent="primary"
                                      size={Spinner.SIZE_SMALL}
                                    />
                                    <MenuItem
                                      disabled={true}
                                      text="Getting all available assets"
                                    />
                                  </div>
                                ) : (
                                  <MenuItem
                                    disabled={true}
                                    text="No available assets"
                                  />
                                )
                              }
                            >
                              <Button
                                rightIcon="caret-down"
                                text={
                                  this.getSelectedNetworkConnectionAsset(port)
                                    ? this.getSelectedNetworkConnectionAsset(
                                        port
                                      )
                                    : "Select Asset"
                                }
                              />
                            </AssetSelect>

                            <StringSelect
                              popoverProps={{
                                minimal: true,
                                popoverClassName: "dropdown",
                                usePortal: true
                              }}
                              disabled={
                                this.getSelectedNetworkConnectionAsset(port)
                                  ? false
                                  : true
                              }
                              items={
                                this.getSelectedNetworkConnectionAsset(port)
                                  ? this.getPortsFromHostname(
                                      this.getSelectedNetworkConnectionAsset(
                                        port
                                      )!
                                    )
                                  : []
                              }
                              onItemSelect={(dest_port: string) => {
                                this.handleNetworkConnectionPortSelection(
                                  port,
                                  dest_port
                                );
                              }}
                              itemRenderer={renderStringItem}
                              itemPredicate={filterString}
                              noResults={
                                this.gettingPowerPortsInProgress ? (
                                  <div>
                                    <Spinner
                                      intent="primary"
                                      size={Spinner.SIZE_SMALL}
                                    />
                                    <MenuItem
                                      disabled={true}
                                      text="Getting available power ports"
                                    />
                                  </div>
                                ) : (
                                  <MenuItem
                                    disabled={true}
                                    text="No available power ports"
                                  />
                                )
                              }
                            >
                              <Button
                                disabled={
                                  this.getSelectedNetworkConnectionAsset(port)
                                    ? false
                                    : true
                                }
                                rightIcon="caret-down"
                                text={
                                  this.getSelectedPort(port)
                                    ? this.getSelectedPort(port)
                                    : "Select Port"
                                }
                              />
                            </StringSelect>
                            <Button
                              icon={IconNames.DELETE}
                              minimal
                              onClick={() => {
                                this.clearNetworkConnectionSelection(port);
                              }}
                            />
                          </FormGroup>
                        </div>
                      );
                    })}
                  </FormGroup>
                </Card>
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
                <Card>
                  <FormGroup
                    label={AssetFormLabels.power_connections}
                    inline={false}
                  >
                    {this.getPowerPortFields()}
                  </FormGroup>
                </Card>
              ) : null}
            </Collapse>
          </Collapse>

          <Card>
            <FormGroup label={AssetFormLabels.owner} inline={false}>
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
            </FormGroup>
            <FormGroup label={AssetFormLabels.comment} inline={false}>
              <textarea
                className={Classes.INPUT}
                placeholder="comment"
                value={values.comment}
                onChange={(e: any) =>
                  this.handleChange({ comment: e.currentTarget.value })
                }
              ></textarea>
            </FormGroup>
          </Card>
          <Button className="login-button" type="submit">
            {this.state.loading ? "Submitting..." : "Submit"}
          </Button>
          <div></div>
          {this.state.loading ? (
            <Spinner intent="primary" size={Spinner.SIZE_SMALL} />
          ) : null}
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
