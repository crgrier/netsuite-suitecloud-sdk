'use strict';

const inquirer = require('inquirer');
const BaseCommandGenerator = require('./BaseCommandGenerator');
const CommandUtils = require('../utils/CommandUtils');
const NodeUtils = require('../utils/NodeUtils');
const OBJECT_TYPES = require('../metadata/ObjectTypesMetadata');
const ProjectMetadataService = require('../services/ProjectMetadataService');
const SDKExecutionContext = require('../SDKExecutionContext');
const TranslationService = require('../services/TranslationService');
const FileSystemService = require('../services/FileSystemService');
const { join } = require('path');
const ANSWERS_NAMES = {
	APP_ID: 'appid',
	SCRIPT_ID: 'scriptid',
	SPECIFY_SCRIPT_ID: 'specifyscriptid',
	SPECIFY_SUITEAPP: 'specifysuiteapp',
    OBJECT_TYPE: 'type',
    SPECIFY_OBJECT_TYPE: 'specifyObjectType',
    TYPE_CHOICES_ARRAY: 'typeChoicesArray',
    DESTINATION_FOLDER: 'destinationfolder',
    PROJECT_FOLDER: 'project',
    OVERRITE_OBJECTS: 'overwrite_objects'
};
const { PROJECT_SUITEAPP , OBJECTS_FOLDER } = require('../ApplicationConstants');
const {
	COMMAND_IMPORTOBJECTS: { QUESTIONS },
	ERRORS,
	YES,
	NO,
} = require('../services/TranslationKeys');

module.exports = class ListObjectsCommandGenerator extends BaseCommandGenerator {
	constructor(options) {
		super(options);
        this._projectMetadataService = new ProjectMetadataService();
		this._fileSystemService = new FileSystemService();        
	}

	_validateFieldIsNotEmpty (fieldValue) {
		return fieldValue !== ''
			? true
			: NodeUtils.formatString(TranslationService.getMessage(ERRORS.EMPTY_FIELD), {
					color: NodeUtils.COLORS.RED,
					bold: true,
			  });
	}

	_validateArrayIsNotEmpty(array) {
		return array.length > 0
			? true
			: NodeUtils.formatString(TranslationService.getMessage(ERRORS.CHOOSE_OPTION), {
					color: NodeUtils.COLORS.RED,
					bold: true,
			  });
	}

	_getCommandQuestions(prompt) {
		var questions = [];
		//create a class to see type based on manifest.
		if (this._projectMetadataService.getProjectType(this._projectFolder) === PROJECT_SUITEAPP) {
			let message = TranslationService.getMessage(QUESTIONS.SPECIFIC_APPID);

			const questionSpecifySuiteApp = {
				type: CommandUtils.INQUIRER_TYPES.LIST,
				name: ANSWERS_NAMES.SPECIFY_SUITEAPP,
				message,
				default: 0,
				choices: [
					{
						name: TranslationService.getMessage(YES),
						value: true,
					},
					{
						name: TranslationService.getMessage(NO),
						value: false,
					},
				],
				validate: this._validateArrayIsNotEmpty,
			};
			questions.push(questionSpecifySuiteApp);

			const questionAppId = {
				when: function(response) {
					return response[ANSWERS_NAMES.SPECIFY_SUITEAPP];
				},
				type: CommandUtils.INQUIRER_TYPES.INPUT,
				name: ANSWERS_NAMES.APP_ID,
				message: TranslationService.getMessage(QUESTIONS.APPID),
				validate: this._validateFieldIsNotEmpty,
			};
			questions.push(questionAppId);
		}

		const questionShowAllObjects = {
			type: CommandUtils.INQUIRER_TYPES.LIST,
			name: ANSWERS_NAMES.SPECIFY_OBJECT_TYPE,
			message: TranslationService.getMessage(QUESTIONS.SHOW_ALL_CUSTOM_OBJECTS),
			default: 0,
			choices: [
				{
					name: TranslationService.getMessage(YES),
					value: false,
				},
				{
					name: TranslationService.getMessage(NO),
					value: true,
				},
			],
		};
		questions.push(questionShowAllObjects);

		const questionCustomOjects = {
			when: function(answers) {
				return answers[ANSWERS_NAMES.SPECIFY_OBJECT_TYPE];
			},
			type: CommandUtils.INQUIRER_TYPES.CHECKBOX,
			name: ANSWERS_NAMES.TYPE_CHOICES_ARRAY,
			message: TranslationService.getMessage(QUESTIONS.FILTER_BY_CUSTOM_OBJECTS),
			pageSize: 15,
			choices: [
				...OBJECT_TYPES.map(customObject => ({
					name: customObject.name,
					value: customObject.value.type,
				})),
				new inquirer.Separator(),
			],

			validate: this._validateArrayIsNotEmpty,
		};

		questions.push(questionCustomOjects);

		const questionSpecifyScriptId = {
			type: CommandUtils.INQUIRER_TYPES.LIST,
			name: ANSWERS_NAMES.SPECIFY_SCRIPT_ID,
			message: TranslationService.getMessage(QUESTIONS.FILTER_BY_SCRIPT_ID),
			default: false,
			choices: [
				{
					name: TranslationService.getMessage(YES),
					value: true,
				},
				{
					name: TranslationService.getMessage(NO),
					value: false,
				},
			],
		};
		questions.push(questionSpecifyScriptId);

		const questionScriptId = {
			when: function(response) {
				return response[ANSWERS_NAMES.SPECIFY_SCRIPT_ID];
			},
			type: CommandUtils.INQUIRER_TYPES.INPUT,
			name: ANSWERS_NAMES.SCRIPT_ID,
			message: TranslationService.getMessage(QUESTIONS.SCRIPT_ID),
            validate: this._validateFieldIsNotEmpty,
		};
        questions.push(questionScriptId);
        
        const transformFoldersToChoicesFunc = folder => 
        ({
            name: folder.replace(this._projectFolder, ''),
            // extracting root prefix
            // replacing '\' for '/', this is done because destinationfolder option in java-sdf works only with '/'
            value: folder.replace(this._projectFolder, '').replace(/\\/g, '/')
        });
		const objectDirectoryChoices = this._fileSystemService
			.getFoldersFromDirectory(join(this._projectFolder, OBJECTS_FOLDER))
			.map(transformFoldersToChoicesFunc);

        const questionDestinationFolder = {
            type: CommandUtils.INQUIRER_TYPES.LIST,
            name: ANSWERS_NAMES.DESTINATION_FOLDER,
            message: TranslationService.getMessage(QUESTIONS.DESTINATION_FOLDER),
            choices: objectDirectoryChoices
        }

        questions.push(questionDestinationFolder);

        const questionOverwriteConfirmation = {
            type: CommandUtils.INQUIRER_TYPES.LIST,
            name: ANSWERS_NAMES.OVERRITE_OBJECTS,
            message: TranslationService.getMessage(QUESTIONS.OVERRITE_OBJECTS),
            default: 0,
            choices: [
				{
					name: TranslationService.getMessage(YES),
					value: true,
				},
				{
					name: TranslationService.getMessage(NO),
					value: false,
				},
			]
        }
        questions.push(questionOverwriteConfirmation);

		return prompt(questions).then(prevAnswers => {
            const questionOverwriteConfirmation2 = {
                type: CommandUtils.INQUIRER_TYPES.LIST,
                name: 'overrite2',
                message: TranslationService.getMessage(QUESTIONS.OVERRITE_OBJECTS),
                default: 0,
                choices: [
                    {
                        name: TranslationService.getMessage(YES),
                        value: true,
                    },
                    {
                        name: TranslationService.getMessage(NO),
                        value: false,
                    },
                ]
            }

            return prompt([questionOverwriteConfirmation2]).then(newAnswers => ({...prevAnswers, ...newAnswers}))
        });
    }
    
    _preExecuteAction(answers) {
        console.log('_preExecuteAction in ImportObjectsCommandGenerator, \n before transform answers:\n', answers)
        
        if (!answers[ANSWERS_NAMES.SPECIFY_OBJECT_TYPE]) {
            answers[ANSWERS_NAMES.OBJECT_TYPE] = 'ALL'
        } else {
            answers[ANSWERS_NAMES.OBJECT_TYPE] = answers[ANSWERS_NAMES.TYPE_CHOICES_ARRAY].join(' ');
        }
        if (!answers[ANSWERS_NAMES.SPECIFY_SCRIPT_ID]) {
            answers[ANSWERS_NAMES.SCRIPT_ID] = 'ALL';
        }
        answers[ANSWERS_NAMES.PROJECT_FOLDER] = this._projectFolder;
        console.log('_preExecuteAction in ImportObjectsCommandGenerator, \n after transform answers:\n', answers)

		return answers;
	}

	_executeAction(answers) {
        if (!answers[ANSWERS_NAMES.OVERRITE_OBJECTS]) {
            return new Promise(resolve => console.log('Command canceled by the user'));
        }

		let options = Object.keys(this._commandMetadata.options);
        var params = CommandUtils.extractOnlyOptionsFromObject(answers, options);
        console.log('params:', params);
		let executionContext = new SDKExecutionContext({
			command: this._commandMetadata.name,
			params,
		});
		return this._sdkExecutor.execute(executionContext);
	}
};
