import PDFDict from 'src/core/objects/PDFDict';
import PDFString from 'src/core/objects/PDFString';
import PDFHexString from 'src/core/objects/PDFHexString';
import PDFName from 'src/core/objects/PDFName';
import PDFArray from 'src/core/objects/PDFArray';
import PDFObject from 'src/core/objects/PDFObject';
import PDFNumber from 'src/core/objects/PDFNumber';
import { PDFAcroTerminal, PDFAcroNonTerminal } from 'src/core/acroform';

class PDFAcroField {
  readonly dict: PDFDict;

  // TODO: Could we avoid this circular dependency?
  static fromDict = (dict: PDFDict): PDFAcroField => {
    const hasKids = !!dict.lookupMaybe(PDFName.of('Kids'), PDFArray)?.size();
    if (hasKids) return PDFAcroNonTerminal.fromDict(dict);
    return PDFAcroTerminal.fromDict(dict);
  };

  protected constructor(dict: PDFDict) {
    this.dict = dict;
  }

  T(): PDFString | PDFHexString | undefined {
    return this.dict.lookupMaybe(PDFName.of('T'), PDFString, PDFHexString);
  }

  Ff(): PDFNumber | undefined {
    const numberOrRef = this.getInheritableAttribute(PDFName.of('Ff'));
    return this.dict.context.lookupMaybe(numberOrRef, PDFNumber);
  }

  Parent(): PDFDict | undefined {
    return this.dict.lookupMaybe(PDFName.of('Parent'), PDFDict);
  }

  getParent(): PDFAcroNonTerminal | undefined {
    const parent = this.Parent();
    if (!parent) return undefined;
    return PDFAcroNonTerminal.fromDict(parent);
  }

  getPartialName(): string | undefined {
    return this.T()?.decodeText();
  }

  getFlags(): number {
    return this.Ff()?.asNumber() ?? 0;
  }

  hasFlag(bitIndex: number): boolean {
    const flags = this.getFlags();
    const flag = 1 << bitIndex;
    return (flags & flag) !== 0;
  }

  getInheritableAttribute(name: PDFName): PDFObject | undefined {
    let attribute: PDFObject | undefined;
    this.ascend((node) => {
      if (!attribute) attribute = node.dict.get(name);
    });
    return attribute;
  }

  ascend(visitor: (node: PDFAcroField) => any): void {
    visitor(this);
    const parent = this.getParent();
    if (parent) parent.ascend(visitor);
  }
}

export default PDFAcroField;
