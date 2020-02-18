import {
  Button,
  Callout,
  Classes,
  FormGroup,
  Intent,
  MenuItem,
  InputGroup
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { API_ROOT } from "../utils/api-config";
import { ModelObject } from "../utils/utils";
import { updateObject } from "../store/utility";
import Field from "./field";
import "./forms.scss";
import $ from "jquery";
import {
  filterString,
  renderCreateItemOption,
  renderStringItem,
  StringSuggest,
  FormTypes
} from "./formUtils";

//TO DO : add validation of types!!!
// var console: any = {};
// console.log = function() {};

export interface ModelFormProps {
  token: string;
  type: FormTypes;
  initialValues?: ModelObject;
  submitForm(model: ModelObject, headers: any): Promise<any> | void;
}
interface ModelFormState {
  values: ModelObject;
  vendors: Array<string>;
  errors: Array<string>;
  networkPortsTemp: Array<string>;
}

export const required = (
  values: ModelObject,
  fieldName: keyof ModelObject
): string =>
  values[fieldName] === undefined ||
  values[fieldName] === null ||
  values[fieldName] === ""
    ? "This must be populated"
    : "";

class ModelForm extends React.Component<ModelFormProps, ModelFormState> {
  initialState: ModelObject = this.props.initialValues
    ? JSON.parse(JSON.stringify(this.props.initialValues))
    : ({} as ModelObject);

  public state = {
    values: this.initialState,
    vendors: [],
    errors: [],
    networkPortsTemp: this.initialState.network_ports
      ? this.initialState.network_ports
      : []
  };
  headers = {
    headers: {
      Authorization: "Token " + this.props.token
    }
  };

  private handleSubmit = (e: any) => {
    this.setState({
      errors: []
    });
    e.preventDefault();
    console.log(this.state);
    if (this.state.values) {
      if (this.props.initialValues) {
        console.log(this.props.initialValues);
        this.setState({
          values: updateObject(this.state.values, {
            id: this.props.initialValues.id
          })
        });
      }

      const resp = this.props.submitForm(this.state.values, this.headers);
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

  private getVendors() {
    axios
      //.get("https://rack-city-dev.herokuapp.com/api/" + path)
      .get(API_ROOT + "api/models/vendors", this.headers)
      .then(res => {
        const vendors: Array<string> = res.data.vendors;
        this.setState({
          vendors: vendors
        });
      })
      .catch(err => {
        console.log(err);
      });
  }

  handleChange = (field: { [key: string]: any }) => {
    let network_ports: Array<string> = this.state.values.network_ports
      ? this.state.values.network_ports
      : [];

    if (field["num_network_ports"]) {
      let num_network_ports = field["num_network_ports"];
      console.log(num_network_ports, network_ports);
      let index = network_ports.length;
      while (network_ports.length < num_network_ports) {
        console.log(index, this.state.networkPortsTemp.length);
        if (index < this.state.networkPortsTemp.length) {
          network_ports.push(this.state.networkPortsTemp[index]);
        } else {
          network_ports.push(((index + 1) as unknown) as string);
        }
        index++;
      }
      while (network_ports.length > num_network_ports) {
        network_ports.pop();
      }
    } else if (field["num_network_ports"] === "") {
      console.log(network_ports);
      this.setState({
        networkPortsTemp: network_ports
      });
      network_ports = [];
    }
    this.setState({
      values: updateObject(this.state.values, {
        ...field,
        network_ports
      })
    });
    console.log(this.props.initialValues);
    console.log(this.state.values);
  };

  handleNetworkPortNameChange = (index: number, name: string) => {
    const network_ports: Array<string> = this.state.values.network_ports
      ? this.state.values.network_ports
      : [];
    network_ports[index] = name;
    this.setState({
      values: updateObject(this.state.values, {
        ...network_ports
      })
    });
  };
  selectText = (event: any) => event.target.select();
  componentDidMount = () => {
    $(".suggest").keydown(function(event) {
      if (event.keyCode == 13) {
        event.preventDefault();
        console.log("ENTER");
        return false;
      }
    });
  };

  render() {
    if (this.state.vendors.length === 0) {
      this.getVendors();
    }
    const { values } = this.state;
    console.log("vendor", this.state.values.vendor);
    return (
      <div className={Classes.DARK + " login-container"}>
        {this.state.errors.map((err: string) => {
          return <Callout intent={Intent.DANGER}>{err}</Callout>;
        })}
        <form
          onSubmit={this.handleSubmit}
          className="create-form bp3-form-group"
        >
          <FormGroup className="suggest" label="Vendor (required)">
            <StringSuggest
              popoverProps={{
                minimal: true,
                popoverClassName: "dropdown",
                usePortal: true
              }}
              defaultSelectedItem={this.state.values.vendor}
              inputValueRenderer={(vendor: string) => this.state.values.vendor}
              items={this.state.vendors}
              onItemSelect={(vendor: string) => {
                console.log("item selected ");
                this.setState({
                  values: updateObject(values, { vendor: vendor })
                });
              }}
              // onQueryChange={(vendor: string) => {
              //   console.log("CHANGE", vendor);
              //   this.setState({
              //     values: updateObject(values, { vendor: vendor })
              //   });
              // }}
              createNewItemRenderer={renderCreateItemOption}
              createNewItemFromQuery={(vendor: string) => vendor}
              itemRenderer={renderStringItem}
              itemPredicate={filterString}
              noResults={<MenuItem disabled={true} text="No results." />}
            />
          </FormGroup>

          <FormGroup label="Model Number (required)" inline={false}>
            <Field
              placeholder="model_number"
              onChange={this.handleChange}
              value={values.model_number}
              field="model_number"
            />
          </FormGroup>
          <FormGroup label="Height (required)" inline={false}>
            <Field
              field="height"
              placeholder="height"
              value={values.height}
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup label="Display Color">
            <Field
              field="display_color"
              type="color"
              value={
                this.props.initialValues ? values.display_color : "#394B59"
              }
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup label="Number of Network Ports " inline={false}>
            <Field
              field="num_network_ports"
              type="string"
              value={values.num_network_ports}
              onChange={this.handleChange}
            />

            {!(
              values.network_ports && values.network_ports.length !== 0
            ) ? null : (
              <table className="port-table">
                <thead>
                  <th>Port Name(s) </th>
                </thead>
                <tbody>
                  {values.network_ports.map((port, index) => {
                    return (
                      <tr>
                        <td>
                          <InputGroup
                            onClick={this.selectText}
                            value={port}
                            type="string"
                            className="network-name"
                            onChange={(e: any) =>
                              this.handleNetworkPortNameChange(
                                index,
                                e.currentTarget.value
                              )
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* <Field
              field="num_ethernet_ports"
              placeholder="num_ethernet_ports"
              value={values.num_ethernet_ports}
              onChange={this.handleChange}
            /> */}
          </FormGroup>
          <FormGroup label="# Power Ports" inline={false}>
            <Field
              field="num_power_ports"
              placeholder="num_power_ports"
              value={values.num_power_ports}
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup label="CPU" inline={false}>
            <Field
              field="cpu"
              placeholder="cpu"
              value={values.cpu}
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup label="Memory(GB)" inline={false}>
            <Field
              field="memory_gb"
              placeholder="memory_gb"
              value={values.memory_gb}
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup label="Storage" inline={false}>
            <Field
              field="storage"
              placeholder="storage"
              value={values.storage}
              onChange={this.handleChange}
            />
          </FormGroup>
          <FormGroup label="Comment" inline={false}>
            <Field
              field="comment"
              placeholder="comment"
              value={values.comment}
              onChange={this.handleChange}
            />
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
export default connect(mapStateToProps)(ModelForm);
// const WrappedCreateModelForm = Form.create()(CreateModelForm);

// export default connect(mapStateToProps)(WrappedCreateModelForm);
