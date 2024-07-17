import { useState, useEffect} from "react"
import { Container, Typography, Box, TextField, Button, Paper } from '@mui/material';
// import ReactMarkdown from 'react-markdown';
import mockData from './mock-data';
import  OpenAIApi  from "openai";
// require('dotenv').config(); causing error due to some breaking change
const Chatbot = () => {
  const openai = new OpenAIApi({
    apiKey: process.env.OPENAI_API_KEY||"",
    dangerouslyAllowBrowser: true 
  });

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [assistantId, setAssistantId] = useState(null);

  //creating assistant
    const createAssistant = async () => {
      try {
        const assistant = await openai.beta.assistants.create({
          name: "FinOpsly Assistant",
          instructions: `You are a helpful assistant designed to output a summary based on the given mock data about cloud service usage metrics: ${JSON.stringify(mockData)}`,
          tools: [{ type: "code_interpreter" }],
          model: "gpt-4-0125-preview"
        });
        setAssistantId(assistant.id);
        return assistant.id;
      } catch (error) {
        console.error("Error creating assistant:", error);
      }
    };

 // Create assistant and generate initial summary when the component mounts
 useEffect(() => {

  const initAssistant = async () => {
    const id = await createAssistant();
    console.log(assistantId);
    const summary = await responseGenerate("Provide a summary based on the mock data.", id);
    setMessages([{ sender: 'system', text: summary }]);
  }
  if(!assistantId)
  initAssistant();
}, [assistantId]);

  // Function to generate a response
  const responseGenerate = async (inputText,assistant_Id) => {
    if (!assistant_Id) {
      console.error("Assistant not created yet");
      return;
    }

    try {
      const thread = await openai.beta.threads.create();
      const message = await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: inputText
      });
     console.log("This is the message object: ", message);
      const run = await openai.beta.threads.runs.createAndPoll(thread.id, { 
        assistant_id: assistant_Id,
        instructions: `You are a helpful assistant designed to output a summary based on the given mock data about cloud service usage metrics: ${JSON.stringify(mockData)}`
      });
      console.log("run",run);
      if (run.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(run.thread_id);
        const lastMessage = messages.data[0];
        const response = lastMessage.content[0].text.value;
        return response;
      } else {
        console.log(run.status);
        return "Error: Unable to complete the request.";
      }
    } catch (error) {
      console.error("Error generating response:", error);
      return "Error: Unable to generate response.";
    }
  };

  //Funtion to handle send button click
  const handleSend = async () => {
    const response = await responseGenerate(input,assistantId);
    console.log("response coming:", response);
    setMessages([...messages, { sender: 'user', text: input }, { sender: 'system', text: response }]);
    setInput('');
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, fontFamily: 'Arial, sans-serif' }}>
      <Typography variant="h4" component="h2" gutterBottom>
        Summary
      </Typography>
      <Paper elevation={3} sx={{ padding: 2, borderRadius: 2, height: '400px', overflowY: 'auto' }}>
        {messages.map((message, index) => (
          <Box
            key={index}
            sx={{
              textAlign: message.sender === 'user' ? 'right' : 'left',
              margin: '10px 0',
            }}
          >
            <Box
              sx={{
                display: 'inline-block',
                padding: 1,
                borderRadius: 2,
                backgroundColor: message.sender === 'user' ? '#dcf8c6' : '#f1f0f0',
              }}
            >
                <Box
                  sx={{
                    textAlign: message.sender === 'user' ? 'right' : 'left',
                    backgroundColor: message.sender === 'user' ? '#dcf8c6' : '#f1f0f0',
                    padding: 1,
                    borderRadius: 2,
                  }}
                >
                  {message.text}
                </Box>
              
            </Box>
          </Box>
        ))}
      </Paper>
      <Box sx={{ display: 'flex', mt: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          sx={{ flex: 1 }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleSend}
          sx={{ ml: 2 }}
        >
          Send
        </Button>
      </Box>
    </Container>
  );
}  
export default Chatbot;