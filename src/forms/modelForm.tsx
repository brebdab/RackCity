import {
  Button,
  Callout,
  Classes,
  FormGroup,
  InputGroup,
  Intent,
  MenuItem,
  Radio,
  RadioGroup,
  Spinner,
  Card,
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { API_ROOT } from "../utils/api-config";
import { ModelObject, MountTypes } from "../utils/utils";
import { updateObject } from "../store/utility";
import Field from "./field";
import "./forms.scss";
import $ from "jquery";
import {
  filterString,
  FormTypes,
  renderStringItem,
  StringSuggest,
} from "./formUtils";

// values mirror backend/database strings

interface ModelFormProps {
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
  loading: boolean;
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
    loading: false,
    errors: [],
    networkPortsTemp: this.initialState.network_ports
      ? this.initialState.network_ports
      : [],
  };
  headers = {
    headers: {
      Authorization: "Token " + this.props.token,
    },
  };
  loadedVendors = false;
  private handleSubmit = (e: any) => {
    e.preventDefault();
    if (this.state.values) {
      this.setState({
        errors: [],
        loading: true,
      });
      if (this.props.initialValues) {
        this.setState({
          values: updateObject(this.state.values, {
            id: this.props.initialValues.id,
          }),
        });
      }

      const resp = this.props.submitForm(this.state.values, this.headers);
      if (resp) {
        resp.then((res) =>
          this.setState({
            loading: false,
          })
        );
        resp.catch((err) => {
          $(".bp3-overlay-scroll-container").scrollTop(0);
          let errors: Array<string> = this.state.errors;
          errors.push(err.response.data.failure_message as string);
          this.setState({
            errors: errors,
            loading: false,
          });
        });
      }
    }
  };

  private getVendors() {
    axios.get(API_ROOT + "api/models/vendors", this.headers).then((res) => {
      this.loadedVendors = true;
      const vendors: Array<string> = res.data.vendors;
      this.setState({
        vendors: vendors,
      });
    });
  }

  handleChange = (field: { [key: string]: any }) => {
    let network_ports: Array<string> = this.state.values.network_ports
      ? this.state.values.network_ports
      : [];
    if (field["num_network_ports"]) {
      let num_network_ports = field["num_network_ports"];
      let index = network_ports.length;
      if (!isNaN(num_network_ports) && num_network_ports < 0) {
        num_network_ports = 0;
      }

      while (network_ports.length < num_network_ports) {
        if (index < this.state.networkPortsTemp.length) {
          network_ports.push(this.state.networkPortsTemp[index].toString());
        } else {
          network_ports.push((index + 1).toString());
        }
        index++;
      }
      while (network_ports.length > num_network_ports) {
        network_ports.pop();
      }
    } else if (field["num_network_ports"] === "") {
      this.setState({
        networkPortsTemp: network_ports,
      });
      network_ports = [];
    }

    this.setState({
      values: updateObject(this.state.values, {
        ...field,
        network_ports,
      }),
    });
  };

  handleNetworkPortNameChange = (index: number, name: string) => {
    const network_ports: Array<string> = this.state.values.network_ports
      ? this.state.values.network_ports
      : [];
    network_ports[index] = name;
    this.setState({
      values: updateObject(this.state.values, {
        ...network_ports,
      }),
    });
  };
  selectText = (event: any) => event.target.select();
  componentDidMount = () => {
    $(".suggest").keydown(function (event) {
      if (event.keyCode === 13) {
        event.preventDefault();
        return false;
      }
    });
  };

  render() {
    if (!this.loadedVendors) {
      this.getVendors();
    }

    const values = this.state.values;
    return (
      <div className={Classes.DARK + " login-container"}>
        {this.state.errors.map((err: string) => {
          return <Callout intent={Intent.DANGER}>{err}</Callout>;
        })}
        <form
          onSubmit={this.handleSubmit}
          className="create-form bp3-form-group"
        >
          <Card>
            <FormGroup className="suggest" label="Vendor*">
              <StringSuggest
                inputProps={{
                  placeholder: "vendor",
                }}
                popoverProps={{
                  minimal: true,
                  popoverClassName: "dropdown",
                  usePortal: true,
                }}
                defaultSelectedItem={this.state.values.vendor}
                inputValueRenderer={(vendor: string) =>
                  this.state.values.vendor
                }
                items={this.state.vendors}
                onItemSelect={(vendor: string) => {
                  this.setState({
                    values: updateObject(values, { vendor: vendor }),
                  });
                }}
                onQueryChange={(vendor: string) => {
                  this.setState({
                    values: updateObject(values, { vendor: vendor }),
                  });
                }}
                itemRenderer={renderStringItem}
                itemPredicate={filterString}
                noResults={<MenuItem disabled={true} text="No results." />}
              />
            </FormGroup>

            <FormGroup label="Model Number*" inline={false}>
              <Field
                placeholder="model_number"
                onChange={this.handleChange}
                value={values.model_number}
                field="model_number"
              />
            </FormGroup>
            <FormGroup label="Display Color">
              <Field
                field="display_color"
                type="color"
                value={values.display_color ? values.display_color : "#394B59"}
                onChange={this.handleChange}
              />
            </FormGroup>
          </Card>
          <Card>
            <RadioGroup
              label="Mount Type*"
              className="radio-group"
              onChange={(e: any) => {
                this.setState({
                  values: updateObject(values, {
                    model_type: e.currentTarget.value,
                  }),
                });
              }}
              selectedValue={values.model_type}
            >
              <Radio
                label={MountTypes.RACKMOUNT}
                value={MountTypes.RACKMOUNT}
              />
              <Radio
                label={MountTypes.BLADE_CHASSIS}
                value={MountTypes.BLADE_CHASSIS}
              />
              <Radio label={MountTypes.BLADE} value={MountTypes.BLADE} />
            </RadioGroup>

            {values.model_type === MountTypes.RACKMOUNT ||
            values.model_type === MountTypes.BLADE_CHASSIS ? (
              <div>
                <FormGroup
                  label="Height*
          "
                  inline={false}
                >
                  <Field
                    field="height"
                    placeholder="height"
                    value={values.height}
                    onChange={this.handleChange}
                  />
                </FormGroup>
                <FormGroup label="Number of Network Ports " inline={false}>
                  <Field
                    field="num_network_ports"
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
                </FormGroup>
                <FormGroup label="# Power Ports" inline={false}>
                  <Field
                    field="num_power_ports"
                    placeholder="num_power_ports"
                    value={values.num_power_ports}
                    onChange={this.handleChange}
                  />
                </FormGroup>
              </div>
            ) : null}
          </Card>
          <Card>
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
              <textarea
                className={Classes.INPUT}
                placeholder="comment"
                value={values.comment}
                onChange={(e: any) =>
                  this.handleChange({ comment: e.currentTarget.value })
                }
              />
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
    token: state.token,
  };
};
export default connect(mapStateToProps)(ModelForm);
// const WrappedCreateModelForm = Form.create()(CreateModelForm);

// export default connect(mapStateToProps)(WrappedCreateModelForm);
