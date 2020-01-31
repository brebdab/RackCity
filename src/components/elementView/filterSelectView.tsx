import { FormGroup, HTMLSelect, MenuItem, Button } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import { Suggest } from "@blueprintjs/select";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import Field from "../../forms/field";
import "../../forms/forms.scss";
import { filterString, renderStringItem } from "../../forms/formUtils";
import { updateObject } from "../../store/utility";
import "./elementView.scss";
import { RackRangeFields } from "./rackSelectView";
import RackRangeOptions from "./rackRangeOptions";

export enum TextFilterTypes {
  EXACT = "exact",
  CONTAINS = "contains"
}
export enum FilterTypes {
  TEXT = "text",
  NUMERIC = "numeric",
  RACKRANGE = "rack_range"
}
export interface NumericFilter {
  min?: number;
  max?: number;
}
export interface TextFilter {
  value?: string;
  match_type: TextFilterTypes;
}
export interface IFilter {
  field: string;
  filter_type?: FilterTypes;
  filter?: TextFilter | NumericFilter | RackRangeFields;
}
interface FilterSelectViewState extends IFilter {
  // field: string | undefined;
  // filter: TextFilter | NumericFilter | RackRangeFields | undefined;
  // type: string | number | RackObject;
}

interface FilterSelectViewProps {
  token: string;
  fields: Array<string>;
  handleAddFilter(filter: IFilter): void;
}
const numberFields = [
  "elevation",
  "height",
  "num_ethernet_ports",
  "num_power_ports",
  "memory_gb"
];

function getFilterType(field: string | undefined) {
  if (field) {
    if (field === "rack") {
      return FilterTypes.RACKRANGE;
    } else if (numberFields.includes(field)) {
      return FilterTypes.NUMERIC;
    }
    return FilterTypes.TEXT;
  }
}

class FilterSelectView extends React.Component<
  FilterSelectViewProps & RouteComponentProps,
  FilterSelectViewState
> {
  state = {
    field: "",
    filter: undefined
  };
  renderFilterOptions(field: string | undefined) {
    const type = getFilterType(field);
    if (type === FilterTypes.TEXT) {
      return this.getTextFilterOptions();
    }
    if (type === FilterTypes.NUMERIC) {
      return this.getNumericFilterOptions();
    }
    if (type === FilterTypes.RACKRANGE) {
      return this.getRackFilterOptions();
    }
    return null;
  }
  setTextFilterType(type: TextFilterTypes) {
    this.setState({});
  }
  getRackFilterOptions() {
    return <RackRangeOptions handleChange={this.handleChange} range={true} />;
  }
  getNumericFilterOptions() {
    return (
      <div>
        <FormGroup>
          <Field
            field="min"
            placeholder="min"
            type="number"
            onChange={this.handleChange}
          />
        </FormGroup>
        <FormGroup>
          <Field
            field="max"
            placeholder="max"
            type="number"
            onChange={this.handleChange}
          />
        </FormGroup>
      </div>
    );
  }

  getTextFilterOptions() {
    return (
      <FormGroup>
        <div className="bp3-select">
          <HTMLSelect
            onChange={(e: any) =>
              this.handleChange({ match_type: e.target.value })
            }
          >
            <option> {TextFilterTypes.CONTAINS}</option>
            <option>{TextFilterTypes.EXACT}</option>
          </HTMLSelect>
        </div>
        <Field
          field="value"
          placeholder="query"
          type="string"
          onChange={this.handleChange}
        />
      </FormGroup>
    );
  }
  setFilterType(field: string) {
    this.setState({
      field: field,
      filter_type: getFilterType(field)
    });
    const type = getFilterType(field);
    if (type === FilterTypes.TEXT) {
      const filter: TextFilter = {
        match_type: TextFilterTypes.CONTAINS
      };
      console.log(updateObject(this.state.filter, { ...filter }));
      this.setState({
        filter: filter
      });
    }
    if (type === FilterTypes.NUMERIC) {
      const filter: NumericFilter = {};
      this.setState({
        filter: filter
      });
    }
    if (type === FilterTypes.RACKRANGE) {
      const filter: RackRangeFields = {} as RackRangeFields;
      this.setState({
        filter: filter
      });
    }
  }
  handleChange = (field: { [key: string]: any }) => {
    const test = updateObject(this.state.filter, {
      ...field
    });
    console.log(
      updateObject(this.state.filter, {
        ...field
      })
    );
    this.setState({
      filter: test
    });
  };
  handleSubmit = (e: any) => {
    e.preventDefault();
    console.log("test");
    const filter: IFilter = { ...this.state };
    this.props.handleAddFilter(filter);
  };
  render() {
    console.log("STATE", this.state);
    return (
      <div>
        <FormGroup label="Select Field To Filter ">
          {" "}
          <FieldSuggest
            popoverProps={{
              minimal: true,
              popoverClassName: "dropdown",
              usePortal: true
            }}
            inputValueRenderer={(letter: string) => letter}
            itemRenderer={renderStringItem}
            items={this.props.fields}
            onItemSelect={(field: string) => this.setFilterType(field)}
            itemPredicate={filterString}
            noResults={<MenuItem disabled={true} text="No matching fields" />}
          />
        </FormGroup>

        {this.state.field ? this.renderFilterOptions(this.state.field) : null}
        <Button className="button" icon="filter" onClick={this.handleSubmit}>
          Add Filter
        </Button>
      </div>
    );
  }
}

const FieldSuggest = Suggest.ofType<string>();
const items = [""];
const mapStateToProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin
  };
};

export default connect(mapStateToProps)(withRouter(FilterSelectView));
