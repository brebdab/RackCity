import * as React from "react";

interface FileProps {
  callback: any
}

interface FileState {
  prompt: string
}

async function parse(file: File) {
  return new Promise((resolve, reject) => {
    let content = '';
    const reader = new FileReader();
    reader.onloadend = function(e: any) {
      content = e.target.result;
      const result = content//.split(/\r\n|\n/);
      resolve(result);
    };
    reader.onerror = function(e: any) {
      reject(e);
    };
    reader.readAsText(file)
  });
}

export class FileSelector extends React.Component<FileProps, FileState>
{

  public state: FileState = {
    prompt: "Choose file..."
  }

    constructor(props: any)
    {
        super(props);
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(target: any) {
      parse(target.files[0]).then((res) => {
        console.log(res);
        this.props.callback(target.files[0].name)
      })
    }

    render ()
    {
        return (
          <label className={"bp3-file-input"}>
            <input type="file" onChange={ (e: any) => { this.handleChange(e.target) } } />
            <span className={"bp3-file-upload-input bp3-text-overflow-ellipsis"}>{this.state.prompt}</span>
          </label>
      );
    }
}

export default FileSelector
