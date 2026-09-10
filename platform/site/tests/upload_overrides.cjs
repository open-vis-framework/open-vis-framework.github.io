/* Run after platform assets are installed: node site/tests/upload_overrides.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const platform = path.resolve(__dirname, '../..');
const assets = process.env.OVF_ASSETS || path.join(platform, '.venv/var/instance/assets');
const req = createRequire(path.join(assets, 'package.json'));
const React = req('react');
const { renderToStaticMarkup } = req('react-dom/server');
const { Formik, useFormikContext } = req('formik');
// Only globals referenced by react-overridable's module initialization. Its
// DOM effects do not run during server rendering.
global.window = globalThis;
global.Element = class Element {};
global.requestAnimationFrame = () => 0;
global.cancelAnimationFrame = () => {};
const { default: Overridable, OverridableContext } = req('react-overridable');
const source = fs.readFileSync(process.env.OVF_MAPPING || path.join(platform, 'assets/js/invenio_app_rdm/overridableRegistry/mapping.js'), 'utf8');
const body = source.slice(source.indexOf('// Presentation groups'));
let formCount = 0;
const NativeForm = ({ children, record, config, files, permissions, errors }) => {
  formCount++;
  assert.equal(record.id, 'draft-id');
  assert.ok(config.custom_fields);
  assert.ok(files);
  assert.ok(permissions);
  assert.deepEqual(errors, []);
  return React.createElement(Formik, {initialValues:record, onSubmit:()=>{}}, React.createElement('form', null, children));
};
const NativeAccordion = ({children, label}) => React.createElement('section', null, label, children);
const Field = ({label, fieldPath}) => {
  const { values } = useFormikContext();
  return React.createElement('label', {'data-field':fieldPath}, label, req('lodash/get')(values,fieldPath)||'');
};
const code = req('@swc/core').transformSync(`const React=require('react');const {useEffect,useState}=React;const {useFormikContext}=require('formik');const _get=require('lodash/get');const {Input,TextArea,Dropdown,Checkbox,AccordionField,DepositFormApp}=require('fixtures');const overriddenComponents={};${body}\nmodule.exports=overriddenComponents;`, {jsc:{parser:{syntax:'ecmascript',jsx:true},target:'es2020'},module:{type:'commonjs'}}).code;
const loaded = {exports:{}};
new Function('require','module','exports',code)(name=>name==='fixtures'?{Input:Field,TextArea:Field,Dropdown:Field,Checkbox:Field,AccordionField:NativeAccordion,DepositFormApp:NativeForm}:req(name),loaded,loaded.exports);
const input=(field,group)=>({field,form_group:group,props:{label:field},ui_widget:'Input'});
const config={custom_fields:{ui:[{section:'Context',native_fields:[],fields:[input('ovf:viz_url','visualization'),input('ovf:data_sources','essentials'),input('ovf:main_message','reader'),input('ovf:other','context')]}]}};
const record={id:'draft-id',metadata:{title:'Saved title'},custom_fields:{'ovf:main_message':'Saved answer'}};
const shared={record,config,customFieldsUI:config.custom_fields.ui};
const region=(name, child, props={})=>React.createElement(Overridable,{id:`InvenioAppRdm.Deposit.${name}`,...props},child);
const Title = ()=>React.createElement('input',{name:'metadata.title',defaultValue:'Saved title'});
const main = React.createElement('div',{computer:11},
 region('Files.before.container',null,shared),
 region('AccordionFieldFiles.container',React.createElement(NativeAccordion,{includesPaths:['files'],active:true},React.createElement('div',null,'UPLOADER'),React.createElement('div',null,'PREVIEW SELECTOR')),shared),
 region('AccordionFieldBasicInformation.container',React.createElement(NativeAccordion,{includesPaths:['metadata.title']},
   region('TitlesField.container',React.createElement(Title),{fieldPath:'metadata.title'}),
   region('CopyrightsField.container',React.createElement('div',null,'COPYRIGHT'))),shared),
 region('AccordionFieldFunding.container',React.createElement('div',null,'FUNDING')),
 region('CustomFields.container',React.createElement('div',null),shared));
// Match the real contract: multiple inner children inside the replaced form.
const tree=React.createElement(OverridableContext.Provider,{value:loaded.exports},
 region('RDMDepositForm.layout', React.createElement(NativeForm,{record,config,files:{entries:[]},permissions:{},errors:[]},
  region('FormFeedback.container',React.createElement('div',null,'FORM FEEDBACK')),React.createElement('div',null,main),region('CardDepositStatusBox.container',React.createElement('aside',null,'SAVE PREVIEW PUBLISH'))),shared));
const html=renderToStaticMarkup(tree);
assert.equal(formCount,1,'The native form provider must be recreated exactly once');
for(const text of ['UPLOADER','PREVIEW SELECTOR','Saved title','Saved answer','FUNDING','COPYRIGHT','FORM FEEDBACK','SAVE PREVIEW PUBLISH','Share a visualization','Step 2','Add context']) assert(html.includes(text),text);
assert(html.indexOf('Add context')<html.indexOf('FUNDING'));
assert.equal((html.match(/data-field="custom_fields.ovf:viz_url"/g)||[]).length,1);
console.log('Upload overrides render through real react-overridable: provider, multiple children, upload controls, metadata, and sidebar preserved.');

// React 16 schedules a MessageChannel when a browser global is present.
process.exit(0);
