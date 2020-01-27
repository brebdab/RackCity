import {
  Button,
  Classes,
  FormGroup,
  InputGroup,
  MenuItem
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import { ItemPredicate, ItemRenderer, Suggest } from "@blueprintjs/select";
import Form, { FormComponentProps } from "antd/lib/form";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { API_ROOT } from "../api-config";
import "./login.scss";

export interface IModelState {
  vendors: Array<string>;
}
export interface CreateModelFormProps {
  token: string;
  dispatch: any;
}
export interface IModelObject {
  vendor: string | undefined;
  model_number: string | undefined;
  height: number | undefined;
  display_color: string | undefined;
  num_ethernet_ports: number | undefined;
  num_power_ports: number | undefined;
  cpu: string | undefined;
  memory_gb: number | undefined;
  storage: string | undefined;
  comment: string | undefined;
}

function escapeRegExpChars(text: string) {
    // eslint-disable-next-line
  return text.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}
const FormItem = Form.Item;

export const filterVendor: ItemPredicate<string> = (
  query,
  vendor,
  _index,
  exactMatch
) => {
  const normalizedTitle = vendor.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (exactMatch) {
    return normalizedTitle === normalizedQuery;
  } else {
    return normalizedTitle.indexOf(normalizedQuery) >= 0;
  }
};
function highlightText(text: string, query: string) {
  let lastIndex = 0;
  const words = query
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(escapeRegExpChars);
  if (words.length === 0) {
    return [text];
  }

  const regexp = new RegExp(words.join("|"), "gi");
  const tokens: React.ReactNode[] = [];
  while (true) {
    const match = regexp.exec(text);
    if (!match) {
      break;
    }
    const length = match[0].length;
    const before = text.slice(lastIndex, regexp.lastIndex - length);
    if (before.length > 0) {
      tokens.push(before);
    }
    lastIndex = regexp.lastIndex;
    tokens.push(<strong key={lastIndex}>{match[0]}</strong>);
  }
  const rest = text.slice(lastIndex);
  if (rest.length > 0) {
    tokens.push(rest);
  }
  return tokens;
}
export const renderVendor: ItemRenderer<string> = (
  vendor,
  { handleClick, modifiers, query }
) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }
  return <MenuItem text={highlightText(vendor, query)} onClick={handleClick} />;
};
export const renderCreateFilmOption = (
  query: string,
  active: boolean,
  handleClick: React.MouseEventHandler<HTMLElement>
) => (
  <MenuItem
    icon="add"
    text={`Use"${query}"`}
    active={active}
    onClick={handleClick}
    shouldDismissPopover={false}
  />
);

const VendorSuggest = Suggest.ofType<string>();
export class CreateModelForm extends React.Component<
  CreateModelFormProps & FormComponentProps,
  IModelState & IModelObject
> {
  public state = {
    vendors: [],
    vendor: undefined,
    model_number: undefined,
    height: undefined,
    display_color: undefined,
    num_power_ports: undefined,
    num_ethernet_ports: undefined,
    cpu: undefined,
    memory_gb: undefined,
    storage: undefined,
    comment: undefined
  };

  getVendors() {
    const headers = {
      headers: {
        Authorization: "Token " + this.props.token
      }
    };

    axios
      //.get("https://rack-city-dev.herokuapp.com/api/" + path)
      .get(API_ROOT + "api/models/vendors", headers)
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

  handleSubmit = (e: any) => {
    console.log(e);
    e.preventDefault();
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        console.log(values);
        let modelObject: IModelObject;
        modelObject = { ...values };
        modelObject["vendor"] = this.state.vendor;
        const headers = {
          headers: {
            Authorization: "Token " + this.props.token
          }
        };
        console.log(modelObject);
        axios
          .post(API_ROOT + "api/models/add", modelObject, headers)
          .catch(err => console.log(err));
      }
    });
  };

  render() {
    if (this.state.vendors.length === 0) {
      this.getVendors();
    }
    const { getFieldDecorator } = this.props.form;

    return (
      <div className={Classes.DARK + " login-container"}>
        <Form
          onSubmit={this.handleSubmit}
          className="create-form bp3-form-group"
        >
          <h2>Add a New Model</h2>
          <FormGroup label="Vendor">
            <VendorSuggest
              inputValueRenderer={(vendor: string) => vendor}
              items={this.state.vendors}
              onItemSelect={(vendor: string) =>
                this.setState({
                  vendor: vendor
                })
              }
              createNewItemRenderer={renderCreateFilmOption}
              createNewItemFromQuery={(vendor: string) => vendor}
              // onItemSelect={() => {}}
              itemRenderer={renderVendor}
              itemPredicate={filterVendor}
              noResults={<MenuItem disabled={true} text="No results." />}
            />
          </FormGroup>

          <FormItem label="Model Number">
            {getFieldDecorator("model_number", {
              rules: [{ required: true, message: "Please input model number!" }]
            })(<InputGroup className="field" placeholder="model_number" />)}
          </FormItem>
          <FormItem label="Height">
            {getFieldDecorator("height", {
              rules: [{ required: true, message: "Please input your height!" }]
            })(
              <InputGroup
                className="field"
                placeholder="height"
                type="number"
              />
            )}
          </FormItem>
          <FormItem label="Display Color">
            {getFieldDecorator("display_color", {
              rules: [
                { required: false, message: "Please input your display_color!" }
              ]
            })(
              <InputGroup
                className="field"
                placeholder="display color "
                type="number"
              ></InputGroup>
            )}
          </FormItem>
          <FormItem label="Number of Ethernet Ports ">
            {getFieldDecorator("num_ethernet_ports", {
              rules: [
                {
                  required: false,
                  message: "Please input your num_ethernet_ports!"
                }
              ]
            })(
              <InputGroup
                className="field"
                placeholder="ethernet ports"
                type="number"
              ></InputGroup>
            )}
          </FormItem>
          <FormItem label="Number of Power Ports ">
            {getFieldDecorator("num_power_ports", {
              rules: [
                {
                  required: false,
                  message: "Please input your num_power_ports!"
                }
              ]
            })(
              <InputGroup
                className="field"
                placeholder="power ports"
                type="number"
              ></InputGroup>
            )}
          </FormItem>
          <FormItem label="CPU">
            {getFieldDecorator("cpu", {
              rules: [{ required: false, message: "Please input CPU!" }]
            })(
              <InputGroup
                className="field"
                placeholder="cpu"
                type="string"
              ></InputGroup>
            )}
          </FormItem>
          <FormItem label="Memory (GB)">
            {getFieldDecorator("memory_gb", {
              rules: [{ required: false, message: "Please input Memory!" }]
            })(
              <InputGroup
                className="field"
                placeholder="memory"
                type="number"
              ></InputGroup>
            )}
          </FormItem>
          <FormItem label="Storage">
            {getFieldDecorator("storage", {
              rules: [
                { required: false, message: "Please input your username!" }
              ]
            })(
              <InputGroup
                className="field"
                placeholder="storage"
                type="number"
              ></InputGroup>
            )}
          </FormItem>
          <FormItem label="Comment">
            {getFieldDecorator("comment", {
              rules: [
                { required: false, message: "Please input your username!" }
              ]
            })(
              <InputGroup
                className="field"
                placeholder="Comment"
                type="text"
              ></InputGroup>
            )}
          </FormItem>
          <Button className="login-button" type="submit">
            Login
          </Button>
        </Form>
      </div>
    );
  }
}

const mapStateToProps = (state: any) => {
  return {
    token: state.token
  };
};

const WrappedCreateModelForm = Form.create()(CreateModelForm);

export default connect(mapStateToProps)(WrappedCreateModelForm);
