export function PanelActionIcon({kind}:{kind:"export"|"excel"|"back"|"filter"}) {
  const paths={export:"M12 3v12m-4-4 4 4 4-4M5 15v5h14v-5",excel:"M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12l6 6m0-6-6 6",back:"m14 6-6 6 6 6M8 12h12",filter:"M4 5h16l-6 7v6l-4 2v-8L4 5Z"};
  return <svg className="panel-action-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]}/></svg>;
}
