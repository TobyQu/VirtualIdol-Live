// 引入过渡动画组件
import {TransitionGroup, CSSTransition} from 'react-transition-group';
import React, {useEffect, useRef, useState} from "react";
import {IconButton} from "./iconButton";
import {TextButton} from "./textButton";
import {Message} from "@/features/messages/messages";
import {
    custoRoleFormData,
    customrolEdit,
    customroleCreate,
    customroleDelete,
    customroleList
} from "@/features/customRole/customRoleApi";
import {
    uploadBackground,
    queryBackground,
    backgroundModelData,
    deleteBackground,
    uploadVrmModel,
    queryUserVrmModels,
    querySystemVrmModels,
    vrmModelData,
    deleteVrmModel,
    generateMediaUrl,
    buildVrmModelUrl, uploadRolePackage
} from "@/features/media/mediaApi";
import {
    getConfig,
    saveConfig,
    GlobalConfig,
    MemoryStorageConfig
} from "@/features/config/configApi";
import {
    KoeiroParam,
    PRESET_A,
    PRESET_B,
    PRESET_C,
    PRESET_D,
} from "@/features/constants/koeiroParam";
import {Link} from "./link";
import {damp} from 'three/src/math/MathUtils';
import {join} from 'path';
import {voiceData, getVoices, getEmotions} from '@/features/tts/ttsApi';
import { showSuccess, showError } from "@/lib/toast";
import { EmotionSettings } from "./settings/emotion-settings";
import { VoiceSettings } from "./settings/voice-settings";
import { AssetsSettings } from "./settings/assets-settings";
import { useForm } from "react-hook-form";

const tabNames = ['基础设置', '角色设置', '语音设置', '语言模型', '记忆模块', '情绪设置', '高级设置', '资产设置'];
const llm_enums = ["openai", "ollama",'zhipuai']

const publicDir = join(process.cwd(), 'public');

interface TabItemProps {
    name: string;
    isActive: boolean;
    onClick: () => void;
}

type Props = {
    globalConfig: GlobalConfig;
    openAiKey: string;
    systemPrompt: string;
    chatLog: Message[];
    koeiroParam: KoeiroParam;
    remoteLoadVrmFile: (url: string) => void;
    onClickClose: () => void;
    onChangeAiKey: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onChangeBackgroundImageUrl: (key: string) => void;
    onChangeSystemPrompt: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onChangeChatLog: (index: number, text: string) => void;
    onChangeKoeiroParam: (x: number, y: number) => void;
    onClickOpenVrmFile: () => void;
    onClickResetChatLog: () => void;
    onClickResetSystemPrompt: () => void;
};

interface MemorySettingsProps {
    config: {
        memoryStorageConfig: MemoryStorageConfig;
    };
}

export const Settings = ({
                             globalConfig,
                             openAiKey,
                             chatLog,
                             systemPrompt,
                             koeiroParam,
                             remoteLoadVrmFile,
                             onClickClose,
                             onChangeSystemPrompt,
                             onChangeAiKey,
                             onChangeBackgroundImageUrl,
                             onChangeChatLog,
                             onChangeKoeiroParam,
                             onClickOpenVrmFile,
                             onClickResetChatLog,
                             onClickResetSystemPrompt,
                         }: Props) => {

    const [currentTab, setCurrentTab] = useState('基础设置');
    const form = useForm({
        defaultValues: {
            ttsVoiceId: "-1",
            emotion: "neutral",
            vrmModel: "",
            backgroundUrl: ""
        }
    });
    const [formData, setFormData] = useState<GlobalConfig>({
        characterConfig: {
            character: -1,
            character_name: '',
            yourName: '',
            vrmModel: '',
            vrmModelType: ''
        },
        ttsConfig: {
            ttsType: 'minimax',
            ttsVoiceId: '-1',
            emotion: 'neutral'
        },
        conversationConfig: {
            conversationType: 'default',
            languageModel: 'openai'
        },
        memoryStorageConfig: {
            enableLongMemory: false,
            enableSummary: false,
            enableReflection: false,
            languageModelForSummary: 'openai',
            languageModelForReflection: 'openai',
            milvusMemory: {
                host: 'localhost',
                port: '19530',
                user: '',
                password: '',
                dbName: 'virtualwife'
            },
            zep_memory: {
                zep_url: '',
                zep_optional_api_key: ''
            }
        },
        languageModelConfig: {
            openai: {
                OPENAI_API_KEY: '',
                OPENAI_BASE_URL: ''
            },
            zhipuai: {
                ZHIPUAI_API_KEY: ''
            },
            ollama: {
                OLLAMA_API_BASE: 'http://localhost:11434',
                OLLAMA_API_MODEL_NAME: 'qwen:7b'
            }
        },
        liveStreamingConfig: {
            B_ROOM_ID: '',
            B_COOKIE: ''
        },
        enableProxy: false,
        enableLive: false,
        httpProxy: '',
        httpsProxy: '',
        socks5Proxy: '',
        background_id: -1,
        background_url: '',
        emotionConfig: {
            enabled: true,
            sensitivity: 0.5,
            changeSpeed: 0.5,
            defaultEmotion: 'neutral',
            expressionIntensity: 0.7
        }
    });
    const [customRoles, setCustomRoles] = useState([custoRoleFormData]);
    const [enableProxy, setEnableProxy] = useState(formData?.enableProxy || false);
    const [enableLive, setEnableLive] = useState(formData?.enableLive || false);
    const [conversationType, setConversationType] = useState(formData?.conversationConfig?.conversationType || 'default');
    const [ttsType, setTTSType] = useState(formData?.ttsConfig?.ttsType || 'Edge');
    const [enableLongMemory, setEnableLongMemory] = useState(formData?.memoryStorageConfig?.enableLongMemory || false);
    const [enableSummary, setEnableSummary] = useState(formData?.memoryStorageConfig?.enableSummary || false);
    const [enableReflection, setEnableReflection] = useState(formData?.memoryStorageConfig?.enableReflection || false);
    const [customRole, setCustomRole] = useState(custoRoleFormData);
    const [enableCreateRole, setEnableCreateRole] = useState(true);
    const [customRoleLog, setCustomRoleLog] = useState("");
    const [deleteCustomRoleLog, setDeleteCustomRoleLog] = useState("");
    const [deleteBackgroundLog, setDeleteBackgroundLog] = useState("");
    const [selectedRoleId, setSelectedRoleId] = useState(-1);
    const [selectedBackgroundId, setSelectedBackgroundId] = useState(-1);
    const [backgroundModels, setBackgroundModels] = useState([backgroundModelData]);
    const [voices, setVoices] = useState([voiceData]);
    const [emotions, setEmotions] = useState<string[]>([]);
    const [systemVrmModels, setSystemVrmModels] = useState<any[]>([]);
    const [userVrmModels, setUserVrmModels] = useState<any[]>([]);
    const [selectedVrmModelId, setSelectedVrmModelId] = useState(-1);
    const [deleteVrmModelLog, setDeleteVrmModelLog] = useState("");
    const [uploadRolePackageLog, setUploadRolePackageLog] = useState("");

    const backgroundFileInputRef = useRef<HTMLInputElement>(null);
    const VrmModelFileInputRef = useRef<HTMLInputElement>(null);
    const RolePackagelFileInputRef = useRef<HTMLInputElement>(null);

    // 初始化数据
    useEffect(() => {
        // 获取角色列表
        customroleList().then(data => setCustomRoles(data));
        // 获取背景列表
        queryBackground().then(data => setBackgroundModels(data));
        // 获取系统VRM模型列表
        querySystemVrmModels().then(data => setSystemVrmModels(data));
        // 获取用户VRM模型列表
        queryUserVrmModels().then(data => setUserVrmModels(data));
        // 获取语音列表
        getVoices().then(data => setVoices(data));
        // 获取情绪列表
        getEmotions().then(data => setEmotions(data));
    }, []);

    // 更新formData时同步更新其他状态
    useEffect(() => {
        if (formData) {
            setEnableProxy(formData.enableProxy || false);
            setEnableLive(formData.enableLive || false);
            setConversationType(formData.conversationConfig?.conversationType || 'default');
            setTTSType('minimax'); // 强制设置为minimax
            setEnableLongMemory(formData.memoryStorageConfig?.enableLongMemory || false);
            setEnableSummary(formData.memoryStorageConfig?.enableSummary || false);
            setEnableReflection(formData.memoryStorageConfig?.enableReflection || false);
        }
    }, [formData]);

    // 监听变化重新渲染
    useEffect(() => {
        // rerender
        getVoices().then(data => setVoices(data))
    }, [])

    // 监听变化重新渲染
    useEffect(() => {
        // rerender
    }, [enableProxy, conversationType, enableLongMemory, enableSummary, enableReflection, formData, customRoles])

    useEffect(() => {
        if (globalConfig) {
            console.log("Updating formData with globalConfig:", globalConfig);
            // 确保深度合并对象而不是浅合并
            setFormData(prev => {
                const newFormData = {
                    ...prev,
                    ...globalConfig,
                    characterConfig: {
                        ...prev.characterConfig,
                        ...globalConfig.characterConfig
                    },
                    ttsConfig: {
                        ...prev.ttsConfig,
                        ...globalConfig.ttsConfig
                    },
                    conversationConfig: {
                        ...prev.conversationConfig,
                        ...globalConfig.conversationConfig
                    },
                    memoryStorageConfig: {
                        ...prev.memoryStorageConfig,
                        ...globalConfig.memoryStorageConfig,
                        milvusMemory: {
                            ...prev.memoryStorageConfig?.milvusMemory,
                            ...globalConfig.memoryStorageConfig?.milvusMemory
                        },
                        zep_memory: {
                            ...prev.memoryStorageConfig?.zep_memory,
                            ...globalConfig.memoryStorageConfig?.zep_memory
                        }
                    },
                    languageModelConfig: {
                        ...prev.languageModelConfig,
                        ...globalConfig.languageModelConfig,
                        openai: {
                            ...prev.languageModelConfig?.openai,
                            ...globalConfig.languageModelConfig?.openai
                        },
                        zhipuai: {
                            ...prev.languageModelConfig?.zhipuai,
                            ...globalConfig.languageModelConfig?.zhipuai
                        },
                        ollama: {
                            ...prev.languageModelConfig?.ollama,
                            ...globalConfig.languageModelConfig?.ollama
                        }
                    },
                    liveStreamingConfig: {
                        ...prev.liveStreamingConfig,
                        ...globalConfig.liveStreamingConfig
                    }
                };
                console.log("New formData:", newFormData);
                return newFormData;
            });
        }
    }, [globalConfig]);

    const handleSubmit = () => {
        try {
            console.log("Saving configuration:", formData);
            saveConfig(formData)
                .then(() => {
                    console.log("Configuration saved successfully");
                    showSuccess("设置已成功保存!");
                    onClickClose();
                })
                .catch(error => {
                    console.error("Failed to save configuration:", error);
                    showError(`保存设置失败: ${error.message}`);
                });
        } catch (e: unknown) {
            console.error("Error in handleSubmit:", e);
            const errorMessage = e instanceof Error ? e.message : String(e);
            showError(`保存设置时出错: ${errorMessage}`);
        }
    }

    // Tab组件添加flex样式
    const TabItem: React.FC<TabItemProps> = ({name, isActive, onClick}) => {
        return (
            <div
                className={`tab-item ${isActive ? 'active' : ''}`}
                onClick={onClick}
            >
                {name}
            </div>
        );
    };

    // 基础设置组件
    const BasicSettings = () => {
        if (!formData || !formData.characterConfig) {
            return <div>加载中...</div>;
        }

        const defaultFormData = {
            characterConfig: {
                character: -1,
                character_name: '',
                yourName: '',
                vrmModel: '',
                vrmModelType: ''
            },
            ttsConfig: {
                ttsType: 'Edge',
                ttsVoiceId: '-1'
            },
            conversationConfig: {
                conversationType: 'default',
                languageModel: 'openai'
            },
            background_id: -1,
            background_url: ''
        };

        const safeFormData = { ...defaultFormData, ...formData };

        return (
            <div className="globals-settings">
                <div className="section">
                    <div className="title">角色卡设置</div>
                    <div className="field">
                        <label>选择角色</label>
                        <select
                            value={safeFormData.characterConfig.character}
                            onChange={e => {
                                const selectedRoleId = e.target.options[e.target.selectedIndex].getAttribute('data-key');
                                const selectedRoleName = e.target.options[e.target.selectedIndex].getAttribute('data-val');
                                if (selectedRoleId && selectedRoleName) {
                                    const newFormData = { 
                                        ...safeFormData,
                                        characterConfig: {
                                            ...safeFormData.characterConfig,
                                            character: Number(selectedRoleId),
                                            character_name: selectedRoleName
                                        }
                                    };
                                    setFormData(newFormData);
                                }
                            }}>
                            {(customRoles || []).map(role => (
                                <option key={role.id} value={role.id} data-key={role.id} data-val={role.role_name}>
                                    {role.role_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="field">
                        <label>你的名字</label>
                        <input 
                            type="text" 
                            value={safeFormData.characterConfig.yourName || ''}
                            onChange={e => {
                                const newFormData = { ...safeFormData };
                                newFormData.characterConfig.yourName = e.target.value;
                                setFormData(newFormData);
                            }}
                        />
                    </div>

                    <div className="field">
                        <label>VRM角色模型</label>
                        <select
                            value={safeFormData.characterConfig.vrmModel || ''}
                            onChange={e => {
                                const selectedVrmModelType = e.target.options[e.target.selectedIndex].getAttribute('data-type');
                                if (selectedVrmModelType) {
                                    const newFormData = { ...safeFormData };
                                    newFormData.characterConfig.vrmModel = e.target.value;
                                    newFormData.characterConfig.vrmModelType = selectedVrmModelType;
                                    setFormData(newFormData);
                                    const vrm_url = buildVrmModelUrl(e.target.value, selectedVrmModelType);
                                    remoteLoadVrmFile(vrm_url);
                                }
                            }}>
                            {systemVrmModels.map(vrm => (
                                <option key={vrm.id} value={vrm.vrm} data-type={vrm.type}>
                                    {vrm.original_name}
                                </option>
                            ))}
                            {userVrmModels.map(vrm => (
                                <option key={vrm.id} value={vrm.vrm} data-type={vrm.type}>
                                    {vrm.original_name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="section">
                    <div className="title">语音设置</div>
                    <div className="field">
                        <label>语音引擎:</label>
                        <div className="minimax-tts-info">
                            仅支持Minimax语音合成服务
                        </div>
                    </div>

                    <div className="field">
                        <label>选择语音模型:</label>
                        <select
                            value={formData.ttsConfig.ttsVoiceId}
                            onChange={e => {
                                const selectedVoiceId = e.target.options[e.target.selectedIndex].getAttribute('data-key');
                                if (selectedVoiceId) {
                                    const newFormData = {
                                        ...formData,
                                        ttsConfig: {
                                            ...formData.ttsConfig,
                                            ttsType: 'minimax',
                                            ttsVoiceId: selectedVoiceId
                                        }
                                    };
                                    setFormData(newFormData);
                                    setTTSType('minimax');
                                }
                            }}>
                            <option key="-1" value="-1" data-key="-1">请选择</option>
                            {(voices || []).map(voice => (
                                <option key={voice.id} value={voice.id} data-key={voice.id}>
                                    {voice.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="field">
                        <label>语音情绪:</label>
                        <select
                            value={formData.ttsConfig.emotion || 'neutral'}
                            onChange={e => {
                                const selectedEmotion = e.target.value;
                                const newFormData = {
                                    ...formData,
                                    ttsConfig: {
                                        ...formData.ttsConfig,
                                        emotion: selectedEmotion
                                    }
                                };
                                setFormData(newFormData);
                            }}>
                            {(emotions || []).map(emotion => (
                                <option key={emotion} value={emotion}>
                                    {emotion === 'happy' && '高兴'}
                                    {emotion === 'sad' && '悲伤'}
                                    {emotion === 'angry' && '愤怒'}
                                    {emotion === 'fearful' && '害怕'}
                                    {emotion === 'disgusted' && '厌恶'}
                                    {emotion === 'surprised' && '惊讶'}
                                    {emotion === 'neutral' && '中性'}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="section">
                    <div className="title">对话设置</div>
                    <div className="checkbot-field">
                        <label>对话模式:</label>
                        <input className='checkbot-input' type="radio" name="chatType" value="default"
                               onChange={() => {
                                   safeFormData.conversationConfig.conversationType = 'default';
                                   setFormData(safeFormData);
                                   setConversationType(safeFormData.conversationConfig.conversationType);
                               }}
                               checked={conversationType === 'default'}/> 普通对话模式
                        {/* <input className='checkbot-input' type="radio" name="chatType" value="thought-chain"
              onChange={() => {
                safeFormData.conversationConfig.conversationType = 'thought_chain';
                setFormData(safeFormData);
                setConversationType(safeFormData.conversationConfig.conversationType);
              }}
              checked={conversationType === 'thought_chain'}
            /> 推理+生成对话模式 */}
                    </div>

                    <div className="field">
                        <label>选择大语言模型:</label>
                        <select
                            defaultValue={safeFormData.conversationConfig.languageModel}
                            onChange={e => {
                                safeFormData.conversationConfig.languageModel = e.target.value;
                                setFormData(safeFormData);
                            }}>
                            {
                                llm_enums.map(llm => (
                                    <option key={llm} value={llm}>{llm}</option>
                                ))
                            }
                        </select>
                    </div>
                </div>

                <div className="section">
                    <div className="title">壁纸设置</div>
                    <div className="field">
                        <label>选择壁纸</label>
                        <div className="flex items-center justify-center space-x-4">
                            <select
                                defaultValue={safeFormData.background_id + ''}
                                onChange={e => {
                                    const selectedBackgroundId = e.target.options[e.target.selectedIndex].getAttribute('data-key');
                                    let selectedBackgroundUrl = e.target.options[e.target.selectedIndex].getAttribute('data-url');
                                    selectedBackgroundUrl = selectedBackgroundUrl ? selectedBackgroundUrl : ""
                                    safeFormData.background_id = Number(selectedBackgroundId);
                                    safeFormData.background_url = selectedBackgroundUrl;
                                    if (selectedBackgroundId != '-1') {
                                        setFormData(safeFormData);
                                        onChangeBackgroundImageUrl(safeFormData.background_url)
                                        setSelectedBackgroundId(safeFormData.background_id);
                                    }
                                }}>
                                <option key="-1" value="-1" data-key="-1">请选择</option>
                                {backgroundModels.map(backgroundModel => (
                                    <option key={backgroundModel.id} value={backgroundModel.id}
                                            data-key={backgroundModel.id} data-url={backgroundModel.image}>
                                        {backgroundModel.original_name}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="file"
                                ref={backgroundFileInputRef}
                                style={{display: 'none'}}
                                onChange={handleBackgroundFileChange}
                            />
                            <IconButton
                                iconName="16/Add"
                                isProcessing={false}
                                onClick={handleBackgroundButtonClick}
                            ></IconButton>
                            <IconButton
                                iconName="16/Remove"
                                isProcessing={false}
                                onClick={e => {
                                    if (selectedBackgroundId !== -1) {
                                        handleDeleteBackground(selectedBackgroundId)
                                    }
                                }}
                            ></IconButton>
                            <div className="flex justify-end mt-4">
                                {deleteBackgroundLog}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const handleBackgroundButtonClick = () => {
        backgroundFileInputRef?.current?.click();
    };

    const handleBackgroundFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target && event.target.files) {
            const selectedFile = event.target.files[0];
            if (!selectedFile) {
                return;
            }
            const formData = new FormData();
            formData.append('image', selectedFile);
            uploadBackground(formData)
                .then(data => {
                    queryBackground().then(data => setBackgroundModels(data))
                })
        }
    };

    const handleDeleteBackground = (selectedBackgroundId: number) => {
        deleteBackground(selectedBackgroundId)
            .then(data => {
                queryBackground().then(data => setBackgroundModels(data))
                setDeleteBackgroundLog("OK")
            }).catch(e => {
            setDeleteBackgroundLog("ERROR")
        })
    }

    const handleVrmModelButtonClick = () => {
        VrmModelFileInputRef?.current?.click();
    };

    const handleRolePackageButtonClick = () => {
        RolePackagelFileInputRef?.current?.click();
    };

    const handleVrmModelFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target && event.target.files) {
            const selectedFile = event.target.files[0];
            if (!selectedFile) {
                return;
            }
            const formData = new FormData();
            formData.append('vrm', selectedFile);
            uploadVrmModel(formData)
                .then(data => {
                    queryUserVrmModels().then(data => setUserVrmModels(data))
                })
        }
    };

    const handleRolePackageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target && event.target.files) {
            const selectedFile = event.target.files[0];
            if (!selectedFile) {
                return;
            }
            const formData = new FormData();
            formData.append('role_package', selectedFile);
            uploadRolePackage(formData)
                .then(data => {
                    setUploadRolePackageLog("上传成功")
                    customroleList().then(roleData => {
                        setCustomRoles(roleData)
                    })
                })
        }
    };

    const handleDeleteVrmModel = (selectedVrmModelId: number) => {
        deleteVrmModel(selectedVrmModelId)
            .then(data => {
                queryUserVrmModels().then(data => setUserVrmModels(data))
                setDeleteVrmModelLog("OK")
            }).catch(e => {
            setDeleteVrmModelLog("ERROR")
        })
    }

    const LlmSettings = () => {
        const safeConfig = {
            languageModelConfig: {
                openai: {
                    OPENAI_API_KEY: formData?.languageModelConfig?.openai?.OPENAI_API_KEY || '',
                    OPENAI_BASE_URL: formData?.languageModelConfig?.openai?.OPENAI_BASE_URL || ''
                },
                zhipuai: {
                    ZHIPUAI_API_KEY: formData?.languageModelConfig?.zhipuai?.ZHIPUAI_API_KEY || ''
                },
                ollama: {
                    OLLAMA_API_BASE: formData?.languageModelConfig?.ollama?.OLLAMA_API_BASE || 'http://localhost:11434',
                    OLLAMA_API_MODEL_NAME: formData?.languageModelConfig?.ollama?.OLLAMA_API_MODEL_NAME || 'qwen:7b'
                }
            }
        };

        return (
            <div className="globals-settings">
                <div className="section">
                    <div className="title">OpenAI配置</div>
                    <div className="field">
                        <label>OPENAI_API_KEY</label>
                        <input 
                            type="text" 
                            value={safeConfig.languageModelConfig.openai.OPENAI_API_KEY}
                            onChange={e => {
                                setFormData(prev => ({
                                    ...prev,
                                    languageModelConfig: {
                                        ...prev.languageModelConfig,
                                        openai: {
                                            ...prev.languageModelConfig?.openai,
                                            OPENAI_API_KEY: e.target.value
                                        }
                                    }
                                }));
                            }}
                        />
                    </div>
                    <div className="field">
                        <label>OPENAI_BASE_URL</label>
                        <input 
                            type="text" 
                            value={safeConfig.languageModelConfig.openai.OPENAI_BASE_URL}
                            onChange={e => {
                                setFormData(prev => ({
                                    ...prev,
                                    languageModelConfig: {
                                        ...prev.languageModelConfig,
                                        openai: {
                                            ...prev.languageModelConfig?.openai,
                                            OPENAI_BASE_URL: e.target.value
                                        }
                                    }
                                }));
                            }}
                        />
                    </div>
                </div>
                <div className="section">
                    <div className="title">ZhipuAI配置</div>
                    <div className="field">
                        <label>ZHIPUAI_API_KEY</label>
                        <input 
                            type="text" 
                            value={safeConfig.languageModelConfig.zhipuai.ZHIPUAI_API_KEY}
                            onChange={e => {
                                setFormData(prev => ({
                                    ...prev,
                                    languageModelConfig: {
                                        ...prev.languageModelConfig,
                                        zhipuai: {
                                            ...prev.languageModelConfig?.zhipuai,
                                            ZHIPUAI_API_KEY: e.target.value
                                        }
                                    }
                                }));
                            }}
                        />
                    </div>
                </div>
                <div className="section">
                    <div className="title">ollama配置</div>
                    <div className="field">
                        <label>OLLAMA_API_URL</label>
                        <input 
                            type="text"
                            value={safeConfig.languageModelConfig.ollama.OLLAMA_API_BASE}
                            onChange={e => {
                                setFormData(prev => ({
                                    ...prev,
                                    languageModelConfig: {
                                        ...prev.languageModelConfig,
                                        ollama: {
                                            ...prev.languageModelConfig?.ollama,
                                            OLLAMA_API_BASE: e.target.value
                                        }
                                    }
                                }));
                            }}
                        />
                    </div>
                    <div className="field">
                        <label>OLLAMA_API_MODEL_NAME</label>
                        <input 
                            type="text"
                            value={safeConfig.languageModelConfig.ollama.OLLAMA_API_MODEL_NAME}
                            onChange={e => {
                                setFormData(prev => ({
                                    ...prev,
                                    languageModelConfig: {
                                        ...prev.languageModelConfig,
                                        ollama: {
                                            ...prev.languageModelConfig?.ollama,
                                            OLLAMA_API_MODEL_NAME: e.target.value
                                        }
                                    }
                                }));
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    const LongMemoryAdvancedSettings: React.FC<MemorySettingsProps> = ({ config }) => {
        // 长期记忆高级设置
        return (
            <div className="section">
                <div className="title">高级功能</div>
                <div className="section">
                    <div className="checkbot-field">
                        <label>是否开启对话摘要:</label>
                        <input className='checkbot-input' type="radio" name="enableSummary" value="true"
                               onChange={() => {
                                   config.memoryStorageConfig.enableSummary = true;
                                   setFormData(prev => ({
                                       ...prev,
                                       memoryStorageConfig: {
                                           ...prev.memoryStorageConfig,
                                           enableSummary: true
                                       }
                                   }));
                                   setEnableSummary(true);
                               }}
                               checked={enableSummary === true}/> 是
                        <input className='checkbot-input' type="radio" name="enableSummary" value="false"
                               onChange={() => {
                                   config.memoryStorageConfig.enableSummary = false;
                                   setFormData(prev => ({
                                       ...prev,
                                       memoryStorageConfig: {
                                           ...prev.memoryStorageConfig,
                                           enableSummary: false
                                       }
                                   }));
                                   setEnableSummary(false);
                               }}
                               checked={enableSummary === false}/> 否
                    </div>
                    {
                        enableSummary === true ? (
                            <div>
                                <SummaryLLM config={config} />
                            </div>
                        ) : (
                            <div></div>
                        )
                    }
                </div>
                {/* <div className="section">
        <div className="checkbot-field">
          <label>是否开启记忆反思:</label>
          <input className='checkbot-input' type="radio" name="enableReflection" value="true"
            onChange={() => {
              formData.memoryStorageConfig.enableReflection = true;
              setFormData(formData);
              setEnableReflection(formData.memoryStorageConfig.enableReflection);
            }}
            checked={enableReflection === true} /> 是
          <input className='checkbot-input' type="radio" name="enableReflection" value="false"
            onChange={() => {
              formData.memoryStorageConfig.enableReflection = false;
              setFormData(formData);
              setEnableReflection(formData.memoryStorageConfig.enableReflection);
            }}
            checked={enableReflection === false} /> 否
        </div>
        {
          enableReflection === true ? (
            <div>
              <ReflectionLLM />
            </div>
          ) : (
            <div></div>
          )
        }
      </div> */}
            </div>
        )
    }

    const MilvusMemory: React.FC<MemorySettingsProps> = ({ config }) => {
        // Milvus存储设置
        return (
            <div className="section">
                <div className="title">milvus记忆存储配置</div>
                <div className="field">
                    <label>host</label>
                    <input 
                        type="text" 
                        value={config.memoryStorageConfig.milvusMemory.host}
                        onChange={e => {
                            setFormData(prev => ({
                                ...prev,
                                memoryStorageConfig: {
                                    ...prev.memoryStorageConfig,
                                    milvusMemory: {
                                        ...prev.memoryStorageConfig.milvusMemory,
                                        host: e.target.value
                                    }
                                }
                            }));
                        }}
                    />
                    <label>port</label>
                    <input 
                        type="text" 
                        value={config.memoryStorageConfig.milvusMemory.port}
                        onChange={e => {
                            setFormData(prev => ({
                                ...prev,
                                memoryStorageConfig: {
                                    ...prev.memoryStorageConfig,
                                    milvusMemory: {
                                        ...prev.memoryStorageConfig.milvusMemory,
                                        port: e.target.value
                                    }
                                }
                            }));
                        }}
                    />
                    <label>user</label>
                    <input 
                        type="text" 
                        value={config.memoryStorageConfig.milvusMemory.user}
                        onChange={e => {
                            setFormData(prev => ({
                                ...prev,
                                memoryStorageConfig: {
                                    ...prev.memoryStorageConfig,
                                    milvusMemory: {
                                        ...prev.memoryStorageConfig.milvusMemory,
                                        user: e.target.value
                                    }
                                }
                            }));
                        }}
                    />
                    <label>password</label>
                    <input 
                        type="text" 
                        value={config.memoryStorageConfig.milvusMemory.password}
                        onChange={e => {
                            setFormData(prev => ({
                                ...prev,
                                memoryStorageConfig: {
                                    ...prev.memoryStorageConfig,
                                    milvusMemory: {
                                        ...prev.memoryStorageConfig.milvusMemory,
                                        password: e.target.value
                                    }
                                }
                            }));
                        }}
                    />
                    <label>dbName</label>
                    <input 
                        type="text" 
                        value={config.memoryStorageConfig.milvusMemory.dbName}
                        onChange={e => {
                            setFormData(prev => ({
                                ...prev,
                                memoryStorageConfig: {
                                    ...prev.memoryStorageConfig,
                                    milvusMemory: {
                                        ...prev.memoryStorageConfig.milvusMemory,
                                        dbName: e.target.value
                                    }
                                }
                            }));
                        }}
                    />
                </div>
            </div>
        )
    };

    const SummaryLLM: React.FC<MemorySettingsProps> = ({ config }) => {
        return (
            <div className="field">
                <label>选择大语言模型:</label>
                <select
                    defaultValue={config.memoryStorageConfig.languageModelForSummary}
                    onChange={e => {
                        setFormData(prev => ({
                            ...prev,
                            memoryStorageConfig: {
                                ...prev.memoryStorageConfig,
                                languageModelForSummary: e.target.value
                            }
                        }));
                    }}>
                    {
                        llm_enums.map(llm => (
                            <option key={llm} value={llm}>{llm}</option>
                        ))
                    }
                </select>
            </div>)
    }

    const ReflectionLLM = () => {
        return (
            <div className="field">
                <label>选择大语言模型:</label>
                <select
                    defaultValue={formData.memoryStorageConfig.languageModelForReflection}
                    onChange={e => {
                        formData.memoryStorageConfig.languageModelForReflection = e.target.value;
                        setFormData(formData);
                    }}>
                    {
                        llm_enums.map(llm => (
                            <option key={llm} value={llm}>{llm}</option>
                        ))
                    }
                </select>
            </div>)
    }

    const MemorySettings: React.FC = () => {
        const safeMemoryConfig = {
            memoryStorageConfig: {
                enableLongMemory: formData?.memoryStorageConfig?.enableLongMemory || false,
                enableSummary: formData?.memoryStorageConfig?.enableSummary || false,
                enableReflection: formData?.memoryStorageConfig?.enableReflection || false,
                languageModelForSummary: formData?.memoryStorageConfig?.languageModelForSummary || 'openai',
                languageModelForReflection: formData?.memoryStorageConfig?.languageModelForReflection || 'openai',
                milvusMemory: {
                    host: formData?.memoryStorageConfig?.milvusMemory?.host || 'localhost',
                    port: formData?.memoryStorageConfig?.milvusMemory?.port || '19530',
                    user: formData?.memoryStorageConfig?.milvusMemory?.user || '',
                    password: formData?.memoryStorageConfig?.milvusMemory?.password || '',
                    dbName: formData?.memoryStorageConfig?.milvusMemory?.dbName || 'virtualwife'
                },
                zep_memory: {
                    zep_url: formData?.memoryStorageConfig?.zep_memory?.zep_url || '',
                    zep_optional_api_key: formData?.memoryStorageConfig?.zep_memory?.zep_optional_api_key || ''
                }
            }
        };

        return (
            <div className="globals-settings">
                <div className="section">
                    <div className="title">长期记忆功能设置</div>
                    <div className="checkbot-field">
                        <label>是否开启长期记忆:</label>
                        <input 
                            className='checkbot-input' 
                            type="radio" 
                            name="enableLongMemory" 
                            value="true"
                            checked={enableLongMemory === true}
                            onChange={() => {
                                setFormData(prev => ({
                                    ...prev,
                                    memoryStorageConfig: {
                                        ...prev.memoryStorageConfig,
                                        enableLongMemory: true
                                    }
                                }));
                                setEnableLongMemory(true);
                            }}
                        /> 开启
                        <input 
                            className='checkbot-input' 
                            type="radio" 
                            name="enableLongMemory" 
                            value="false"
                            checked={enableLongMemory === false}
                            onChange={() => {
                                setFormData(prev => ({
                                    ...prev,
                                    memoryStorageConfig: {
                                        ...prev.memoryStorageConfig,
                                        enableLongMemory: false
                                    }
                                }));
                                setEnableLongMemory(false);
                            }}
                        /> 关闭
                    </div>
                    {enableLongMemory === true && (
                        <div>
                            <MilvusMemory config={safeMemoryConfig} />
                            <LongMemoryAdvancedSettings config={safeMemoryConfig} />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const AdvancedSettings = () => {
        // 高级设置
        // @ts-ignore
        // @ts-ignore
        return (
            <div className="globals-settings">
                <div className="section">
                    <div className="title">http-proxy设置</div>
                    <div className="checkbot-field">
                        <input className='checkbot-input' type="radio" name="enableProxy" value="true"
                               onChange={() => {
                                   formData.enableProxy = true;
                                   setFormData(formData);
                                   setEnableProxy(formData.enableProxy);
                               }}
                               checked={enableProxy === true}/> 开启
                        <input className='checkbot-input' type="radio" name="enableProxy" value="false"
                               onChange={() => {
                                   formData.enableProxy = false;
                                   setFormData(formData);
                                   setEnableProxy(formData.enableProxy);
                               }}
                               checked={enableProxy === false}/> 关闭
                    </div>
                    {
                        enableProxy === true ? (
                            <div className="field">
                                <label>httpProxy</label>
                                <input type="text" defaultValue={formData.httpProxy}
                                       onChange={e => {
                                           formData.httpProxy = e.target.value
                                           setFormData(formData);
                                       }}/>
                                <label>httpsProxy</label>
                                <input type="text" defaultValue={formData.httpsProxy}
                                       onChange={e => {
                                           formData.httpsProxy = e.target.value
                                           setFormData(formData);
                                       }}/>
                                <label>socks5Proxy</label>
                                <input type="text" defaultValue={formData.socks5Proxy}
                                       onChange={e => {
                                           formData.socks5Proxy = e.target.value
                                           setFormData(formData);
                                       }}/>
                            </div>
                        ) : (
                            <div></div>
                        )
                    }
                </div>
                <div className="section">
                    <div className="title">B站直播配置</div>
                    <div className="checkbot-field">
                        <input className='checkbot-input' type="radio" name="enableLive" value="true"
                               onChange={() => {
                                   formData.enableLive = true;
                                   setFormData(formData);
                                   setEnableLive(formData.enableLive);
                               }}
                               checked={enableLive === true}/> 开启
                        <input className='checkbot-input' type="radio" name="enableLive" value="false"
                               onChange={() => {
                                   formData.enableLive = false;
                                   setFormData(formData);
                                   setEnableLive(formData.enableLive);
                               }}
                               checked={enableLive === false}/> 关闭
                    </div>
                    {
                        enableLive === true ? (
                            <div className="field">
                                <label>直播间ID:</label>
                                <input type="text" defaultValue={formData.liveStreamingConfig.B_ROOM_ID}
                                       onChange={e => {
                                           formData.liveStreamingConfig.B_ROOM_ID = e.target.value
                                           setFormData(formData);
                                       }}/>

                                <label>COOKIE:</label>
                                <input type="text" defaultValue={formData.liveStreamingConfig.B_COOKIE}
                                       onChange={e => {
                                           formData.liveStreamingConfig.B_COOKIE = e.target.value
                                           setFormData(formData);
                                       }}/>
                            </div>
                        ) : (
                            <div></div>
                        )
                    }
                </div>
            </div>
        )
    }


    const CustomRoleSettings = () => {
        // 自定义角色设置
        return (
            <div className="globals-settings">
                <div className="section">
                    <div className="title">自定义角色设置</div>
                    <div className="field">
                        <label>添加或编辑角色</label>
                        <div className="flex items-center justify-center space-x-4">
                            <select
                                value={selectedRoleId}
                                onChange={e => {
                                    const selectedRoleId = Number(e.target.options[e.target.selectedIndex].getAttribute('data-key'));
                                    formData.characterConfig.character = selectedRoleId;
                                    setSelectedRoleId(selectedRoleId)
                                    setEnableCreateRole(false);
                                    setFormData(formData);
                                    setCustomRoleLog("")
                                    setDeleteCustomRoleLog("")
                                    const selectedRole = customRoles.find(role => role.id === selectedRoleId);
                                    if (selectedRole) {
                                        setCustomRole(selectedRole);
                                    }
                                }}>
                                <option key="-1" value="-1" data-key="-1">请选择</option>
                                {customRoles.map(role => (
                                    <option key={role.id} value={role.id} data-key={role.id}>
                                        {role.role_name}
                                    </option>
                                ))}
                            </select>
                            <IconButton
                                iconName="16/Add"
                                isProcessing={false}
                                onClick={e => {
                                    setEnableCreateRole(true)
                                    setCustomRole(custoRoleFormData)
                                }}
                            ></IconButton>
                            <IconButton
                                iconName="16/Remove"
                                isProcessing={false}
                                onClick={e => {
                                    if (selectedRoleId !== -1) {
                                        handleCustomRoleDelete(selectedRoleId)
                                    }
                                }}
                            ></IconButton>
                            <div className="flex justify-end mt-4">
                                {deleteCustomRoleLog}
                            </div>
                        </div>
                        <EditCustomRole/>
                    </div>
                </div>
                <div className="section">
                    <div className="title">自定义VRM模型</div>
                    <div className="field">
                        <label>上传VRM模型</label>
                        <div className="flex items-center justify-center space-x-4">
                            <select
                                value={selectedVrmModelId}
                                onChange={e => {
                                    const selectedVrmModelId = e.target.options[e.target.selectedIndex].getAttribute('data-key');
                                    const vrmModelId = Number(selectedVrmModelId);
                                    setSelectedVrmModelId(vrmModelId);
                                }}>
                                <option key="-1" value="-1" data-key="-1" data-url="">请选择</option>
                                {userVrmModels.map(vrmModel => (
                                    <option key={vrmModel.id} value={vrmModel.id} data-key={vrmModel.id}
                                            data-url={vrmModel.vrm}>
                                        {vrmModel.original_name}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="file"
                                ref={VrmModelFileInputRef}
                                style={{display: 'none'}}
                                onChange={handleVrmModelFileChange}
                            />
                            <IconButton
                                iconName="16/Add"
                                label=''
                                isProcessing={false}
                                onClick={handleVrmModelButtonClick}
                            ></IconButton>
                            <IconButton
                                iconName="16/Remove"
                                label=''
                                isProcessing={false}
                                onClick={e => {
                                    if (selectedVrmModelId !== -1) {
                                        handleDeleteVrmModel(selectedVrmModelId)
                                    }
                                }}
                            ></IconButton>
                            <div className="flex justify-end mt-4">
                                {deleteVrmModelLog}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="section">
                    <div className="my-16">
                        角色安装包可以在
                        <Link
                            url="https://github.com/yakami129/virtualwife-llm-factory"
                            label="virtualwife-llm-factory"
                        />中使用gen_role_package_tool生成，请提前准备语料或者使用项目的工具自动生成
                    </div>
                    <div className="title">加载角色安装包</div>
                    <div className="field">
                        <div className="flex items-center justify-center space-x-4">
                            <input
                                type="file"
                                ref={RolePackagelFileInputRef}
                                style={{display: 'none'}}
                                onChange={handleRolePackageFileChange}
                            />
                            <IconButton
                                iconName="24/UploadAlt"
                                label=''
                                isProcessing={false}
                                onClick={handleRolePackageButtonClick}
                            ></IconButton>
                            <div className="flex justify-end mt-4">
                                {uploadRolePackageLog}
                            </div>
                        </div>
                    </div>
                </div>
            </div>)
    }

    const handleCustomRole = () => {
        if (enableCreateRole) {
            customroleCreate(customRole)
                .then(data => {
                    customroleList().then(data => setCustomRoles(data))
                    setCustomRoleLog("OK")
                }).catch(e => {
                setCustomRoleLog("ERROR")
            })

        } else {
            customrolEdit(customRole.id, customRole).then(data => {
                customroleList()
                    .then(data => setCustomRoles(data))
                setCustomRoleLog("OK")
            }).catch(e => {
                setCustomRoleLog("ERROR")
            })
        }
    }


    const handleCustomRoleDelete = (selectedRoleId: number) => {
        customroleDelete(selectedRoleId)
            .then(data => {
                customroleList()
                    .then(data => setCustomRoles(data))
                setDeleteCustomRoleLog("OK")
            }).catch(e => {
            setDeleteCustomRoleLog("ERROR")
        })
    }

    const EditCustomRole = () => {
        // 编辑角色
        return (
            <div className="globals-settings">
                <div className="section">
                    <div className="field-"></div>
                    {enableCreateRole == true ? (
                        <label>创建角色</label>) : (<label>编辑角色</label>)}
                    <label>角色名称</label>
                    <input
                        type="text"
                        name="role_name"
                        defaultValue={customRole.role_name}
                        onChange={e => {
                            customRole.role_name = e.target.value
                            setCustomRole(customRole)
                        }}
                    />
                    <div className="input-group">
                        <label>角色基本信息定义</label>
                        <textarea
                            className="resize-y w-full p-2"
                            name="persona"
                            defaultValue={customRole.persona}
                            onChange={e => {
                                customRole.persona = e.target.value
                                setCustomRole(customRole)
                            }}
                        />
                    </div>
                    <div className="input-group">
                        <label>角色的性格简短描述</label>
                        <textarea
                            className="resize-y w-full p-2"
                            name="personality"
                            defaultValue={customRole.personality}
                            onChange={e => {
                                customRole.personality = e.target.value
                                setCustomRole(customRole)
                            }}
                        />
                    </div>
                    <div className="input-group">
                        <label>角色的对话的情况和背景</label>
                        <textarea
                            className="resize-y w-full p-2"
                            name="scenario"
                            defaultValue={customRole.scenario}
                            onChange={e => {
                                customRole.scenario = e.target.value
                                setCustomRole(customRole)
                            }}
                        />
                    </div>
                    <div className="input-group">
                        <label>角色的对话样例</label>
                        <textarea
                            className="resize-y w-full p-2"
                            name="examples_of_dialogue"
                            defaultValue={customRole.examples_of_dialogue}
                            onChange={e => {
                                customRole.examples_of_dialogue = e.target.value
                                setCustomRole(customRole)
                            }}
                        />
                    </div>
                    <label>角色propmt模版</label>
                    <select
                        name="custom_role_template_type"
                        defaultValue={customRole.custom_role_template_type}
                        onChange={e => {
                            customRole.custom_role_template_type = e.target.value
                            console.log(customRole.custom_role_template_type)
                            setCustomRole(customRole)
                        }}
                    >
                        <option key="-1" value="-1" data-key="-1">请选择</option>
                        <option key="zh" value="zh">zh</option>
                        {/* 可以继续添加更多选项 */}
                    </select>
                    <div className="flex justify-end mt-4">
                        <IconButton
                            iconName="24/Save"
                            label='提交'
                            isProcessing={false}
                            onClick={handleCustomRole}></IconButton>
                    </div>
                    <div className="flex justify-end mt-4">
                        {customRoleLog}
                    </div>
                </div>
            </div>
        )
    }

    // 添加情绪系统设置组件
    const EmotionSystemSettings = () => {
        return (
            <div className="settings-container">
                <h2 className="settings-title">情绪系统设置</h2>
                <div className="settings-content">
                    <EmotionSettings 
                        globalConfig={formData} 
                        onChangeGlobalConfig={setFormData}
                    />
                </div>
            </div>
        );
    };

    // Tab内容使用过渡动画
    <TransitionGroup>
        <CSSTransition
            timeout={500}
            classNames="fade"
            key={currentTab}
        >
            <div className="tab-content">
                {/* 当前tab内容 */}
            </div>
        </CSSTransition>
    </TransitionGroup>

    return (
        <div className="container">
            <div className="absolute z-40 w-full h-full bg-white/80 backdrop-blur ">
                <div className="absolute m-24 flex gap-[8px]">
                    <IconButton
                        label='关闭'
                        iconName="24/Close"
                        isProcessing={false}
                        onClick={onClickClose}
                        className="mr-2" // 添加右边间距
                    ></IconButton>
                    <IconButton
                        label='保存'
                        iconName="24/Save"
                        isProcessing={false}
                        onClick={handleSubmit}
                    ></IconButton>
                </div>
                <div className="settings">
                    {/* 添加Tab菜单 */}
                    <div className="tab-menu">
                        {tabNames.map(name => (
                            <TabItem
                                key={name}
                                name={name}
                                isActive={name === currentTab}
                                onClick={() => setCurrentTab(name)}
                            />
                        ))}
                    </div>
                    {/* 根据currentTab渲染对应的内容 */}
                    {currentTab === '基础设置' && <BasicSettings/>}
                    {currentTab === '角色设置' && <CustomRoleSettings/>}
                    {currentTab === '语音设置' && 
                        <VoiceSettings 
                            globalConfig={formData} 
                            onChangeGlobalConfig={setFormData} 
                            form={form}
                        />
                    }
                    {currentTab === '语言模型' && <LlmSettings/>}
                    {currentTab === '记忆模块' && <MemorySettings/>}
                    {currentTab === '情绪设置' && <EmotionSystemSettings/>}
                    {currentTab === '高级设置' && <AdvancedSettings/>}
                    {currentTab === '资产设置' && 
                        <AssetsSettings
                            globalConfig={formData}
                            onChangeGlobalConfig={setFormData}
                            onChangeBackgroundImageUrl={onChangeBackgroundImageUrl}
                            form={form}
                        />
                    }
                </div>
            </div>
        </div>
    )
};

