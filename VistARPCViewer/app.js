/*
	VistA Remote Procedure Call Viewer
	Author: Nikolay Topalov

	Copyright 2014 Nikolay Topalov

	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	
	http://www.apache.org/licenses/LICENSE-2.0
	
	Unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License.
*/

var currentRPC;
var sessionDUZ;
var sessionDivision;		// User division
var sessionRPCContext;

EWD.application = {  
	name: 'nstVistARPCViewer',

	onStartup:  function() {
		EWD.getFragment('rpcDetail.html', 'RPC_container'); 
		EWD.getFragment('routineDetail.html', 'Routine_container'); 
		EWD.getFragment('rpcTesterForm.html', 'RPCTesterForm'); 
	},

	 onPageSwap: {
	 },

	 onFragment: {
		 'rpcDetail.html' : function(messageObj) {
				
				// Shows modal RPC tester form
				$('#RPCDetailName').click(function(e) {
					var rpcParm;
					event.preventDefault();
					
					$('#RPCTesterFormTitle').text('RPC [' + currentRPC.name  + ']');
					
					$('#DUZ').text(sessionDUZ);
					$('#Division').text(sessionDivision);
					$('#RPCContextId').text(sessionRPCContext);
					
					var inputParams = $('<div></div>').attr('id', 'RPCTesterParams');
							
					for (var i in currentRPC.inputParameters)  {
						rpcParm = currentRPC.inputParameters[i];
						var fieldId = 'RPCInput'+ i;
						if (rpcParm.type === undefined || rpcParm.type === 'REFERENCE' || rpcParm.type === 'LITERAL') {
							var param = $('<div></div>').
								attr('id','RPCInput'+ i + '-group').
								addClass('form-group');
							
							var lbl = $('<label></label>').
								attr('for', fieldId).
								text(rpcParm.name);
								
							var inputField = $('<input></input>').
											addClass('form-control').
											attr('id', fieldId).
											attr('name', fieldId).
											attr('type', 'text').
											attr('data-toggle','popover').	
											attr('data-content', rpcParm.description).		
											text(rpcParm.name);

							param.append(lbl).append(inputField);
						} else if (rpcParm.type === 'LIST') {
							var param = $('<div></div>')
										.attr('id', fieldId + '-group')
										.attr('name', fieldId + '-group')
										.addClass('form-group');
												
							param.append( $('<label></label>')
										.attr('for', fieldId + '-list')
										.text(rpcParm.name));
										
							param.append(' ').append($('<button type="button" />')			// Add item button
										.attr('data-field-id', fieldId)
										.attr('data-content-parent', rpcParm.description)
										.attr('onClick','onAddListItem($(this))')
										.addClass('btn btn-default')
										.addClass('item-add')						
										.text('Add item'));
										
															
							param.append( $('<ul></ul>')
										.addClass('list-group')
										.attr('id', fieldId + '-list')
										.attr('data-id-counter', 0)); 								
						}
							
						inputParams.append(param);

					}; 
					
					$('#RPCTesterParams').replaceWith(inputParams);
					$('[data-toggle="popover"]').popover({trigger: 'focus','placement': 'auto'});		// initialize pop-over
					document.getElementById('RPCTesterResult').innerHTML = '';
					
					$('#RPCTesterForm').modal('show');
		
					});	
			},
			
		'routineDetail.html' : function(messageObj) {
			
			$('#RoutineDetailClose').click(function(e) { 
				showPane("RPC_container");
			});
		
		},
			 
		'rpcTesterForm.html' : function(messageObj) {
		
			$('#RPCExecuteBtn').click(function(e) {
					// save DUZ and context
					sessionDUZ = $('#DUZ').val();
					sessionDivision = $('#Division').val();
					sessionRPCContext =  $('#RPCContextId').val();
					
					var rpc = {"name": currentRPC.name,
								"duz": sessionDUZ, 
								"division": sessionDivision, 
								"context": sessionRPCContext, 
								"input": []
								};
					var rpcInputParam;
					
					e.preventDefault();

					var inputValue = $('#RPCTester').serializeArray();
					
					for (var i in currentRPC.inputParameters) { 
						rpcInputParam = currentRPC.inputParameters[i];
						rpc.input[i] = {};
						rpc.input[i].type = rpcInputParam.type;

						if (rpcInputParam.type === 'LIST') {

							var itemSubscript;
							var itemValue;
								
							var listItems = $( '#RPCInput' + i + '-list').children();
							rpc.input[i].value = {};
							
							for (var index = 0; index < listItems.length; ++index) {				
								itemSubscript = $('#' + listItems[index].id + '-item-subscript').val();
								itemValue = $('#' + listItems[index].id + '-item-value').val();
								rpc.input[i].value[itemSubscript] = itemValue;
							}
						} 
						else {
							rpc.input[i].value = $('#RPCInput' + i).val();
						};
					};
						
					EWD.sockets.sendMessage({
						type: "executeRPC",
						params: rpc
						});
										
				});
			}
		
		},
		   
		onMessage: {
		
			'selectedRPCList': function(messageObj) {	// process selected RPCs and create a list
				var html = '';
				var rpcs = messageObj.params;
				if (document.getElementById('alphaSort').checked) {
					rpcs = rpcs.sort(function(a, b){
									return a.name > b.name;
									});
				};
				
				var delimiter = ""; // new line or comma
				var singleLine =  document.getElementById('singleLine').checked;
				var displayIEN =  document.getElementById('showIEN').checked;
				var text;
				var html =$('<div></div>');
				for (var rpc in rpcs) {			
					
					text = displayIEN ? rpcs[rpc].ien + ' ' : '';
					text += rpcs[rpc].name;
					
					html.append(delimiter);
					html.append($('<a></a>')
							.addClass('btn-link')
							.attr('data-rpc-ien',rpcs[rpc].ien)
							.text(text));
				
					delimiter = (singleLine) ? ", " : "<br>";
				};
				
				$('#btnShowRPCList').button('reset');
				$('#rpcList').html(html);
				
				$('#rpcList a').click(function (e) {
										displayRPCDetails($(this));
									});
		},
		
		'getRPCDetails' : function(messageObj) {		// process and display RPC details
				// format the RPC detail html
				currentRPC = messageObj.message;
				var x =document.getElementById('RPCDetailName');
				document.getElementById('RPCDetailName').innerHTML = currentRPC.name;
				document.getElementById('RPCDetailContent').innerHTML = renderRPCDetails(currentRPC);	
				showPane('RPC_container');
/* 				document.getElementById("RoutineDetailPane").style.display = 'none';
				document.getElementById("RPCDetailPane").style.display = 'inline';			
 */		},
		
		'getRoutine' : function(messageObj) {	// process and display a routine
				// format the routine detail html			
				var routine = messageObj.message;
				var text = htmlEscape(routine.routine.join('\n'));
				var searchTag = '\n' + routine.routineTag + '(';
				
				text = text.replace(searchTag, '<a name = "'+routine.routineTag+'">' + searchTag +'</a>');
				document.getElementById('RoutineDetailName').innerHTML = routine.routineName;
				document.getElementById('RoutineDetailContent').innerHTML = "<pre>" + text + "</pre>";
				showPane('Routine_container');
				window.location.hash = routine.routineTag;	// jump to the routine tag
		},

		'executeRPC' : function(messageObj) {		// process the RPC result
			var result = messageObj.message;
			var str;
			if (!result.success) {
				str = 'Error : ' + result.message;
			} else {
				if (result.result.type === "ARRAY" || result.result.type === "GLOBAL ARRAY" || result.result.type === "WORD PROCESSING" ) {
					str = JSON.stringify(result.result.value, null, '\t')
				}
				else {
					str = result.result.value;
				};
			};
			document.getElementById("RPCTesterResult").innerHTML = '<pre>' + str + '</pre>';
		}
	}
 };

EWD.onSocketsReady = function() {

  EWD.application.framework = 'bootstrap';
  if (EWD.application.onStartup) EWD.application.onStartup();

};

EWD.onSocketMessage = function(messageObj) {

  if (EWD.application.onMessage) {
    if (EWD.application.onMessage[messageObj.type]) EWD.application.onMessage[messageObj.type](messageObj);
  } 

  if (EWD.application.messageHandlers) EWD.application.messageHandlers(messageObj);

};

var displayRPCDetails = function(obj) {
		var ien = obj.attr('data-rpc-ien');
		EWD.sockets.sendMessage({
			type: "getRPCDetails",
			params: {
				rpcIEN : ien
			}
		});
		
	};
	
var displayRoutine = function(routine, tag ) {
		EWD.sockets.sendMessage({
			type: "getRoutine",
			params: {
				routineName : routine,
				routineTag : tag
			}
		});
		
	};
	
$('#btnShowRPCList').click(function(e) {	
				
				$(this).button('loading');
				$('#RPC_container').hide();
				$('#Routine_container').hide(); 
				
				event.preventDefault();
						
				EWD.sockets.sendMessage({
					type: "processSelection",
					params: {
						ienFrom : document.getElementById('ienFrom').value,
						ienTo : document.getElementById('ienTo').value,
						nameStart : document.getElementById('nameStart').value,
						nameContain : document.getElementById('nameContain').value,
						routine : document.getElementById('routine').value
					}
				});
			});

var closeRoutinePane = function() {
	showPane("RPC_container");
}

// swap RPC and Routine panes			
var showPane = function(name) {		
	if ( name === "Routine_container") {
		$('#RPC_container').hide();
	} else {
		$('#Routine_container').hide();
	};
	
	$('#' + name).show();
};

var onAddListItem = function (obj) {
	var fieldId = obj.attr('data-field-id');
	var dataContentParent = obj.attr('data-content-parent');
	
	var newSubscript = $('#'+fieldId+'-subscript').val();		// new subscript to add
	
	var param = $('#'+fieldId+'-list');		// the ID of the RPC input parameter 
	var lastItemNumber = param.attr('data-id-counter');
	
	param.attr('data-id-counter',++lastItemNumber);	//increase counter of items
	
	var newRow = renderListItem(fieldId + '-item' + lastItemNumber, dataContentParent);	// create a new row item

	param.append(newRow);
	$('[data-toggle="popover"]').popover({trigger: 'focus','placement': 'auto'});		// initialize pop-over
	$('[data-toggle="tooltip"]').tooltip({'placement': 'auto'});
}

var onDeleteListItem = function (btn) {
	var fieldId = btn.attr('data-id');
	$('#' + fieldId).remove();
}

var renderListItem = function (fieldId, dataContentParent) {
  
	var newRow = $('<div></div>')
				.addClass('row')
				.attr('id', fieldId);
	
	var inputSubscript = $('<div></div>')
					.addClass('col-xs-5')
					.append($('<input></input>')
							.addClass('form-control')
							.attr('id', fieldId + '-item-subscript')
							.attr('name', fieldId + '-item-subscript')
							.attr('type', 'text')
							.attr('placeholder','Enter subscript')
							.attr('data-toggle','popover')	
							.attr('data-content',dataContentParent));
							
	var inputValue = $('<div></div>')
					.addClass('col-xs-5')
					.append($('<input></input>')
							.addClass('form-control')
							.attr('id', fieldId + '-item-value')
							.attr('name', fieldId + '-item-value')
							.attr('type', 'text')
							.attr('placeholder','Enter value')
							.attr('data-toggle','popover')	
							.attr('data-content',dataContentParent));							
	
	var btnDel = $('<button></button>')
							.addClass('btn btn-danger')
							.attr('data-id', fieldId)
							.attr('data-toggle','tooltip')
							.attr('data-original-title','Delete item')
							.attr('type', 'button')
							.attr('onClick','onDeleteListItem($(this))')							
							.append($('<span></span>').addClass('glyphicon glyphicon-remove'));
							
	var inputDel = $('<div></div>')
					.addClass('col-xs-1')
					.append(btnDel);						
		
	newRow.append(inputSubscript).append(inputValue).append(inputDel);
		
	return newRow;
}	
	
// return formatted HTML RPC details
var renderRPCDetails = function(rpc) {
			
		var text = '';
		var x;

		text += "<table class='table table-bordered ' cellspacing=0 width=100%>";
			
		// --- RPC characteristics
		text += "<tr class='info'>";
		text += "<th >Tag</th>";
		text += "<th >Routine</th>";
		text += "<th >Availability</th>";
		text += "<th >Status</th>";
		text += "<th >Client Manager</th>";
		text += "<th >Version</th>";
		text += "</tr>";
		
		text += "<td>" +  "<a href=\'javascript:displayRoutine(\""+rpc.routine+"\",\""+rpc.tag+"\")\'>" + rpc.tag + "</a>" +  "</td>";
		text += "<td >" + rpc.routine + "</td>"; 
		text += "<td>" + trimValue(rpc.availability) + "</td>";   
		text += "<td>" + trimValue(rpc.inactive) + "</td>";		
		text += "<td>" + trimValue(rpc.clientManager) + "</td>"; 
		text += "<td>" + trimValue(rpc.version) + "</td>";
			
		// --- RPC Description
		text +=  "<tr class='info'><th colspan=6>Description</th></tr>";
		text +=  "<tr><td  colspan=6>";
		text += "<pre>";
		text += (rpc.description.length > 0) ? htmlEscape(rpc.description) : "&nbsp;";
		text += "</pre>";
		text += "</td></tr>";

		// --- Parameter descriptions
		text += "<tr class='info'>";
		text += "<th class='info'>Input Parameter</th>"
		text += "<th>Sequence</th>";
		text += "<th>Type</th><th>Maximum Length</th>"
		text += "<th colspan=2>Required</th>";
		text += "</tr>";
		
		for (i in rpc.inputParameters)  {
			x = rpc.inputParameters[i];
			text += "<tr>";
			text += "<td rowspan=2>" + trimValue(x.name) + "</td>"
			text += "<td>" + trimValue(x.sequence) + "</td>";
			text += "<td>" + trimValue(x.type) + "</td>";
			text += "<td>" + trimValue(x.maximumLength) + "</td>";
			text += "<td colspan=2>" + trimValue(x.required) + "</td>";
 			text += "</tr>"; 		
			text += "<tr><td  colspan=5>";
			text += "<pre>";
			text +=  (x.description.length > 0) ? htmlEscape(x.description) : "&nbsp;";
			text += "</pre>";
			text += "</td></tr>";
 	 	};
		
		if (rpc.inputParameters.length === 0) {
			text += "<tr><td colspan=6> N/A </td></tr>";
		}
	
 		// --- Result characteristics
		text += "<tr class='info'>";
		text += "<th >Return Parameter</th>";
		text += "<th>Word Wrap</th><th colspan=4>&nbsp;";
		text += "</th></tr>";
		
		text += "<tr>";
		text += "<td >" + rpc.returnValueType + "</td>";
		text += "<td>" + rpc.wordWrapOn + "</td>";
		text += "<td colspan=5>&nbsp;</td>";
		text += "</tr>";
		
		// --- Result description
		text += "<tr class='info'><th colspan=6>Description</th></tr>";
		text += "<tr><td  colspan=6>";
		text += "<pre>";
		text +=  (rpc.returnValueDescription.length > 0) ? htmlEscape(rpc.returnValueDescription) : "&nbsp;";
		text += "</pre>";
		text += "</td></tr>";

		text += "</table>"; 
			
		return text;
	};
	
var trimValue = function(str) {
		var x;
		
		if (typeof str === 'undefined') str = "";
		
		x = str.trim();
		
		return (x === "") ? "&nbsp;" : x ;
	}; 
	
var htmlEscape = function(str) {
    return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
};