'use strict';

import * as vscode from 'vscode';

import { DepNodeProvider, Dependency } from './nodeDependencies';
import { JsonOutlineProvider } from './jsonOutline';
import { FtpExplorer } from './ftpExplorer';
import { FileExplorer } from './fileExplorer';
import { TestViewDragAndDrop } from './testViewDragAndDrop';
import { TestView } from './testView';

let g_selection = 0;
let foundTab = false;
let testEditor: vscode.TextEditor | undefined;

export function activate(context: vscode.ExtensionContext) {
	const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

	// Samples of `window.registerTreeDataProvider`
	const nodeDependenciesProvider = new DepNodeProvider(rootPath);
	vscode.window.registerTreeDataProvider('nodeDependencies', nodeDependenciesProvider);
	vscode.commands.registerCommand('nodeDependencies.refreshEntry', () => nodeDependenciesProvider.refresh());
	vscode.commands.registerCommand('extension.openPackageOnNpm', moduleName => vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`https://www.npmjs.com/package/${moduleName}`)));
	vscode.commands.registerCommand('nodeDependencies.addEntry', () => vscode.window.showInformationMessage(`Successfully called add entry.`));
	vscode.commands.registerCommand('nodeDependencies.editEntry', (node: Dependency) => vscode.window.showInformationMessage(`Successfully called edit entry on ${node.label}.`));
	vscode.commands.registerCommand('nodeDependencies.deleteEntry', (node: Dependency) => vscode.window.showInformationMessage(`Successfully called delete entry on ${node.label}.`));

	const jsonOutlineProvider = new JsonOutlineProvider(context);
	vscode.window.registerTreeDataProvider('jsonOutline', jsonOutlineProvider);
	vscode.commands.registerCommand('jsonOutline.refresh', () => jsonOutlineProvider.refresh());
	vscode.commands.registerCommand('jsonOutline.refreshNode', offset => jsonOutlineProvider.refresh(offset));
	vscode.commands.registerCommand('jsonOutline.renameNode', args => {
		let offset = undefined;
		if (args.selectedTreeItems && args.selectedTreeItems.length) {
			offset = args.selectedTreeItems[0];
		} else if (typeof args === 'number') {
			offset = args;
		}
		if (offset) {
			jsonOutlineProvider.rename(offset);
		}
	});
	vscode.commands.registerCommand('extension.openJsonSelection', range => jsonOutlineProvider.select(range));
	vscode.commands.registerCommand('testView.testRevealRange', () => {

		console.log('Testing Reveal Range in first opened visible tab/text editor, characters 5 to 10 of the first line.');
		foundTab = false;
		testEditor = undefined;
		// Loop over tabs, find one who's uri is a file uri. make sure it's document and text-editor is shown
		// Set a range on either line 0 or 1 (alternates at each call) after a second, and reveals it a after another second.
		// Making sure to preserve focus on original panel in side bar.
		vscode.window.tabGroups.all.forEach((p_tabGroup) => {
			p_tabGroup.tabs.forEach((p_tab) => {

				if (p_tab.input &&
					(p_tab.input as vscode.TabInputText).uri &&
					(p_tab.input as vscode.TabInputText).uri.scheme === "file") {
					vscode.workspace.textDocuments.forEach((p_textDocument) => {
						if (!foundTab) {
							foundTab = true;
							console.log('#1 Found a tab for a text file.');
							const uriToShow = (p_tab.input as vscode.TabInputText).uri;

							vscode.workspace.openTextDocument(uriToShow)
								.then((p_document) => {
									console.log('#2 Got the opened document of the tab.');

									return vscode.window.showTextDocument(
										p_document,
										{
											preserveFocus: true,
											preview: true
										}
									);
								})
								.then((p_editor) => {
									testEditor = p_editor;

									if (g_selection) {
										g_selection = 0;
									} else {
										g_selection = 1;
									}
									// Wait a second
									setTimeout(() => {
										console.log('#3 Set selection by setting the "selection" property of testEditor');
										const w_selection = new vscode.Selection(g_selection, 4, g_selection, 9);
										if (testEditor) {
											testEditor.selection = w_selection;
										}
									}, 1000);
									// Wait another second
									setTimeout(() => {
										console.log('#4 Made sure the text editor under the tab of that document is shown');
										const w_scrollRange = new vscode.Range(g_selection, 4, g_selection, 9);
										if (testEditor) {
											if (testEditor.document.getText().length === 0) {
												vscode.window.showInformationMessage("Opened text editor has no content to reveal! type something more than 10 characters long!");
											} else {
												console.log('#5 Trying to reveal range while preserving focus!');

												testEditor.revealRange(w_scrollRange, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
											}
										}
									}, 2000);
								});

						}

					});
				}
			});
		});
		if (!foundTab) {
			vscode.window.showInformationMessage("No opened texts to test reveal! Open something with some text first!");
		}


	});

	// Samples of `window.createView`
	new FtpExplorer(context);
	new FileExplorer(context);

	// Test View
	new TestView(context);

	// Drag and Drop proposed API sample
	// This check is for older versions of VS Code that don't have the most up-to-date tree drag and drop API proposal.
	if (typeof vscode.DataTransferItem === 'function') {
		new TestViewDragAndDrop(context);
	}
}