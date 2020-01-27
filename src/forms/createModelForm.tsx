import * as React from "react";
import "@blueprintjs/core/lib/css/blueprint.css";
import { connect } from "react-redux";
import axios from "axios";
import "./login.scss";
import {
  Classes,
  InputGroup,
  Button,
  MenuItem,
  FormGroup
} from "@blueprintjs/core";
import { Suggest, ItemRenderer, ItemPredicate } from "@blueprintjs/select";
import FormItem from "antd/lib/form/FormItem";
import Form, { FormComponentProps } from "antd/lib/form";
import { render } from "react-dom";
import { modelView } from "../components/detailedView/modelView/modelView";
import { withRouter } from "react-router";
import { API_ROOT } from "../api-config";
export interface IModelState {
  vendors: Array<string>;
}
export interface CreateModelFormProps {
  token: string;
  dispatch: any;
}
export interface IModel {
  vendor: string | undefined;
  model_number: string | undefined;
  height: number | undefined;
  display_color: string | undefined;
  num_power_ports: number | undefined;
  cpu: string | undefined;
  memory_gb: number | undefined;
  storage: string | undefined;
  comment: string | undefined;
}

function escapeRegExpChars(text: string) {
  return text.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

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
  CreateModelFormProps,
  IModelState & IModel
> {
  public state = {
    vendors: ["test", "vendor"],
    vendor: undefined,
    model_number: undefined,
    height: undefined,
    display_color: undefined,
    num_power_ports: undefined,
    cpu: undefined,
    memory_gb: undefined,
    storage: undefined,
    comment: undefined
  };

  async getVendors() {
    console.log(this.props.token);
    const headers = {
      headers: {
        Authorization: "Token " + this.props.token
      }
    };
    await axios
      //.get("https://rack-city-dev.herokuapp.com/api/" + path)
      .get(API_ROOT + "api/models/vendors", headers)
      .then(res => {
        const data = res.data;
        this.setState({
          vendors: data
        });
      })
      .catch(err => {
        console.log(err);
      });
  }

  async componentDidMount() {
    await this.getVendors();
  }

  render() {
    console.log("test");
    return (
      <div className={Classes.DARK + " login-container"}>
        <Form
          //   onSubmit={this.handleSubmit}
          className="create-form bp3-form-group"
        >
          <h2>Add a New Model</h2>
          <FormGroup label="Vendor" inline={true}>
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

          <FormGroup label="Model Number" inline={true}>
            <InputGroup
              className="field"
              placeholder="model_number"
            ></InputGroup>
          </FormGroup>
          <FormGroup label="Height" inline={true}>
            <InputGroup
              className="field"
              placeholder="height"
              type="number"
            ></InputGroup>
          </FormGroup>
          <FormGroup label="Display Color" inline={true}>
            <InputGroup
              className="field"
              placeholder="display color "
              type="number"
            ></InputGroup>
          </FormGroup>
          <FormGroup label="Number of Ethernet Ports " inline={true}>
            <InputGroup
              className="field"
              placeholder="ethernet ports"
              type="number"
            ></InputGroup>
          </FormGroup>
          <FormGroup label="Number of Power Ports " inline={true}>
            <InputGroup
              className="field"
              placeholder="power ports"
              type="number"
            ></InputGroup>
          </FormGroup>
          <FormGroup label="CPU" inline={true}>
            <InputGroup
              className="field"
              placeholder="cpu"
              type="string"
            ></InputGroup>
          </FormGroup>
          <FormGroup label="Memory (GB)" inline={true}>
            <InputGroup
              className="field"
              placeholder="memory"
              type="number"
            ></InputGroup>
          </FormGroup>
          <FormGroup label="Storage" inline={true}>
            <InputGroup
              className="field"
              placeholder="storage"
              type="number"
            ></InputGroup>
          </FormGroup>
          <FormGroup label="Comment" inline={true}>
            <InputGroup
              className="field"
              placeholder="Comment"
              type="text"
            ></InputGroup>
          </FormGroup>
        </Form>
      </div>
    );
  }
}

const mapStateToProps = (state: any) => {
  console.log(state.token);
  return {
    token: state.token
  };
};
const WrappedCreateModelForm = Form.create()(CreateModelForm);

export default connect(mapStateToProps)(CreateModelForm);
