import { InputGroup } from "@blueprintjs/core";
import * as React from "react";

export interface IFieldProps {
  field: string;
  className: string;
  placeholder: string;
  value: string | undefined;
  onChange(field: { [key: string]: any }): void;
}

class Field extends React.Component<IFieldProps> {
  render() {
    return (
      <InputGroup
        className={this.props.className}
        placeholder={this.props.placeholder}
        value={this.props.value}
        onChange={(e: any) =>
          this.props.onChange({ [this.props.field]: e.currentTarget.value })
        }
      />
    );
  }
}
export default Field;
