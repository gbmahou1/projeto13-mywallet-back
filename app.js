import express from 'express';
import { MongoClient } from "mongodb";
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

let db;
const mongoClient = new MongoClient(process.env.MONGO_URI);

app.post('/signup', async (req, res) => {
    try
    {
        await mongoClient.connect();
        const dbMw = mongoClient.db("my_wallet");
        const usersCollection = dbMw.collection("users");
        const { nome, email, password, confirm } = req.body;
        const userWithThisEmail = await usersCollection.find({email: email}).toArray();

        if(userWithThisEmail.length != 0)
        {
            return res.status(409).send("Email já cadastrado...");
        }

        if(password != confirm)
        {
            return res.status(409).send("As senhas não estão iguais....");
        }

        const senhaCriptografada = bcrypt.hashSync(password, 10);

        await usersCollection.insertOne({nome: nome, email: email, password: senhaCriptografada});

        res.sendStatus(201);

        mongoClient.close()
    }
    catch (error)
    {
        res.status(500).send(error)
		mongoClient.close()
    }
})

app.post('/signin', async (req, res) => {
    try
    {
        await mongoClient.connect();
        const dbMw = mongoClient.db("my_wallet");
        const { email, password } = req.body;
        const user = await dbMw.collection("users").findOne({ email });
        if(user && bcrypt.compareSync(password, user.password)) 
        {
            
            const token = uuid();
        
			await dbMw.collection("sessions").insertOne({
				userId: user._id,
				token})

        return res.status(201).send(token);
        } 
        else 
        {
            return res.status(409).send("Usuario ou senha incorretos...");
        }
    }
    catch (error)
    {
        res.status(500).send(error)
        console.log(error)
		mongoClient.close()
    }
})

app.get('/userfromtoken', async (req, res) => {
    try
    {
        const {token} = req.headers;
        await mongoClient.connect();
        const dbMw = mongoClient.db("my_wallet");
        const session = await dbMw.collection("sessions").findOne({ token });

        if(!session)
        {
            return res.status(409).send("Houve algum problema");
        }

        const user = await dbMw.collection("users").findOne({ _id: session.userId });

        console.log(user)
        
        if(!user)
        {
            return res.status(409).send("Houve algum problema");
        }

        res.send(user);
    }
    catch (error)
    {
        res.status(500).send(error)
        console.log(error)
		mongoClient.close()
    }
})

app.get('/regsfromtoken', async (req, res) => {
    try
    {
        const {token} = req.headers;
        await mongoClient.connect();
        const dbMw = mongoClient.db("my_wallet");
        const regsCollection = dbMw.collection("registries");
        const session = await dbMw.collection("sessions").findOne({ token });
        console.log(session);

        if(!session)
        {
            return res.sendStatus(409);
        }
        const userRegs = await regsCollection.find({userId: session.userId}).toArray();
        res.send(userRegs);
    }
    catch (error)
    {
        res.status(500).send(error)
        console.log(error)
		mongoClient.close()
    }
})

app.post('/entrada', async (req, res) => {
    try
    {
        const {token} = req.headers;
        const { valor, descricao } = req.body;
        await mongoClient.connect();
        const dbMw = mongoClient.db("my_wallet");
        const regsCollection = dbMw.collection("registries");
        const session = await dbMw.collection("sessions").findOne({ token });

        await dbMw.collection("registries").insertOne({
            userId: session.userId,
            valor: parseInt(valor),
            descricao: descricao
        })

        return res.sendStatus(201)
    }
    catch (error)
    {
        res.status(500).send(error)
        console.log(error)
		mongoClient.close()
    }
})

app.post('/saida', async (req, res) => {
    try
    {
        const {token} = req.headers;
        const { valor, descricao } = req.body;
        await mongoClient.connect();
        const dbMw = mongoClient.db("my_wallet");
        const regsCollection = dbMw.collection("registries");
        const session = await dbMw.collection("sessions").findOne({ token });

        console.log(descricao)

        await dbMw.collection("registries").insertOne({
            userId: session.userId,
            valor: -parseInt(valor),
            descricao: descricao
        })

        return res.sendStatus(201)
    }
    catch (error)
    {
        res.status(500).send(error)
        console.log(error)
		mongoClient.close()
    }
})




app.listen(5000, () => {
    console.log("Rodando em http://localhost:5000");
  });